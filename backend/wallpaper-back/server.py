import os
import sys
import time
import json
import ctypes
import logging
import threading
import traceback
import datetime
import winreg
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from pydantic import BaseModel, Field
import uvicorn
import requests
import shutil
from bson import ObjectId
from pymongo import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection
from pymongo.errors import ConnectionFailure
from gridfs import GridFS
from gridfs.errors import NoFile
import io
import platform
import mimetypes
from PIL import Image
import socket
import hashlib
import subprocess

# Configuração do logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('wallpaper_agent.log', encoding='utf-8')
    ]
)
logger = logging.getLogger('WallpaperAgent')

# Configuração
PORTA_AGENTE = 8002
ID_AGENTE = "agente-wallpaper-001"
REGISTRAR_COM_BACKEND = False
URL_BACKEND = "http://localhost:5000/api/agentes"

# Endereço/porta do servidor FastAPI
# OBS: Em todo o código, as referências no main usam HOST e PORT,
# então definimos aqui com base na configuração acima.
HOST = "0.0.0.0"
PORT = PORTA_AGENTE
PUBLIC_HOST = "localhost"

# Valores calculados em runtime
MACHINE_CODE = None  # Código único de 5 dígitos por máquina
AGENT_URL = None     # URL acessível do agente (http://<ip_local>:<porta>)

# Chave no Registro para persistir configurações do agente
REGISTRY_PATH = r"Software\WallpaperAgent"

# Helpers de Identidade e Sistema
def _get_machine_guid() -> str:
    """Obtém o MachineGuid do Windows (estável por máquina)."""
    try:
        key = winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            r"SOFTWARE\Microsoft\Cryptography",
            0,
            winreg.KEY_READ | getattr(winreg, 'KEY_WOW64_64KEY', 0)
        )
        guid, _ = winreg.QueryValueEx(key, "MachineGuid")
        key.Close()
        return str(guid)
    except Exception:
        return ""

def _compute_code_from_guid(guid: str) -> str:
    """Gera um código de 5 dígitos a partir de um GUID (determinístico)."""
    if not guid:
        guid = platform.node() or "unknown"
    digest = hashlib.sha1(guid.encode("utf-8")).hexdigest()
    # Usa os últimos 9 hex para reduzir colisões, mod 100000 para 5 dígitos
    num = int(digest[-9:], 16) % 100000
    return f"{num:05d}"

def get_or_create_machine_code() -> str:
    """Lê do Registro HKCU; se não existir, calcula por MachineGuid e persiste."""
    try:
        # Tenta ler de HKCU
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, REGISTRY_PATH, 0, winreg.KEY_READ)
            code, _ = winreg.QueryValueEx(key, "MachineCode")
            key.Close()
            if code and isinstance(code, str) and len(code) == 5:
                return code
        except Exception:
            pass

        # Calcula a partir do MachineGuid (estável) e salva em HKCU
        computed = _compute_code_from_guid(_get_machine_guid())
        try:
            key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, REGISTRY_PATH)
            winreg.SetValueEx(key, "MachineCode", 0, winreg.REG_SZ, computed)
            key.Close()
        except Exception:
            # Se falhar para escrever, ainda retorna o calculado
            pass
        return computed
    except Exception:
        # Fallback: número aleatório baseado no tempo (não ideal, mas evita crash)
        return f"{int(time.time()) % 100000:05d}"

def get_local_ip() -> str:
    """Obtém o IP local preferencial (interface de saída)."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"

def get_motherboard_info() -> Dict[str, Any]:
    """Tenta obter fabricante/produto/serial da placa-mãe via WMIC (sem dependências extras)."""
    info = {"manufacturer": None, "product": None, "serial": None}
    try:
        result = subprocess.run(
            ["wmic", "baseboard", "get", "Manufacturer,Product,SerialNumber", "/format:csv"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0 and result.stdout:
            lines = [l.strip() for l in result.stdout.splitlines() if l.strip()]
            # Esperado: Node,Manufacturer,Product,SerialNumber
            if len(lines) >= 2:
                headers = [h.strip().lower() for h in lines[0].split(',')]
                values = [v.strip() for v in lines[1].split(',')]
                mapping = dict(zip(headers, values))
                info["manufacturer"] = mapping.get("manufacturer")
                info["product"] = mapping.get("product")
                info["serial"] = mapping.get("serialnumber")
    except Exception:
        pass
    return info

def bytes_to_gb(n: int) -> float:
    try:
        return round(n / (1024**3), 2)
    except Exception:
        return 0.0

def get_system_info() -> Dict[str, Any]:
    """Coleta nome do dispositivo, RAM, armazenamento, placa-mãe, IP e agentUrl."""
    info: Dict[str, Any] = {}
    try:
        info["device_name"] = os.environ.get("COMPUTERNAME") or platform.node() or "Desconhecido"
        # RAM e Disco: usar shutil.disk_usage e ctypes para RAM se psutil não estiver disponível
        try:
            import psutil  # opcional
            vm = psutil.virtual_memory()
            info["ram_total_gb"] = bytes_to_gb(getattr(vm, "total", 0))
        except Exception:
            # Fallback RAM via ctypes GlobalMemoryStatusEx
            try:
                class MEMORYSTATUSEX(ctypes.Structure):
                    _fields_ = [
                        ("dwLength", ctypes.c_ulong),
                        ("dwMemoryLoad", ctypes.c_ulong),
                        ("ullTotalPhys", ctypes.c_ulonglong),
                        ("ullAvailPhys", ctypes.c_ulonglong),
                        ("ullTotalPageFile", ctypes.c_ulonglong),
                        ("ullAvailPageFile", ctypes.c_ulonglong),
                        ("ullTotalVirtual", ctypes.c_ulonglong),
                        ("ullAvailVirtual", ctypes.c_ulonglong),
                        ("ullAvailExtendedVirtual", ctypes.c_ulonglong),
                    ]
                stat = MEMORYSTATUSEX()
                stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
                ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
                info["ram_total_gb"] = bytes_to_gb(stat.ullTotalPhys)
            except Exception:
                info["ram_total_gb"] = None
        # Armazenamento (disco do sistema)
        try:
            total, used, free = shutil.disk_usage(os.getenv('SystemDrive') + "\\")
        except Exception:
            total, used, free = shutil.disk_usage("/")
        info["storage_total_gb"] = bytes_to_gb(total)
        info["storage_free_gb"] = bytes_to_gb(free)
        # Placa-mãe
        info["motherboard"] = get_motherboard_info()
        # IP e URL do agente
        ip = get_local_ip()
        info["ip"] = ip
        info["agent_url"] = f"http://{ip}:{PORT}"
    except Exception as e:
        logger.warning(f"Falha ao coletar informações do sistema: {e}")
    return info

# Configuração do MongoDB
MONGO_URI = "mongodb+srv://frontend-puro:redefacil@frontend-puro.gblsaeh.mongodb.net/frontend-puro?retryWrites=true&w=majority&appName=frontend-puro"
DB_NAME = "inventory_management"
WALLPAPER_COLLECTION = "wallpapers"

# Inicializa o cliente MongoDB
try:
    client = MongoClient(MONGO_URI)
    # Verifica a conexão
    client.admin.command('ping')
    db = client[DB_NAME]
    wallpapers_collection = db[WALLPAPER_COLLECTION]
    fs = GridFS(db, collection=WALLPAPER_COLLECTION)
    logger.info("Conectado ao MongoDB com sucesso!")
except ConnectionFailure as e:
    logger.error(f"Falha ao conectar ao MongoDB: {e}")
    raise

app = FastAPI(
    title="Wallpaper Agent API",
    description="API para gerenciamento de papel de parede",
    version="1.0.0"
)

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Wallpaper Agent API está rodando!",
        "endpoints": {
            "test_cors": "/test-cors (GET)",
            "obter_status": "/obter_status (GET)",
            "alterar_papel_de_parede": "/alterar_papel_de_parede (POST)"
        },
        "status": "online",
        "timestamp": datetime.datetime.now().isoformat()
    }

# Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    # Permite todas as origens para facilitar o desenvolvimento entre máquinas
    # Não usar credenciais com "*"
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Adiciona headers CORS manualmente
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    if request.method == "OPTIONS":
        from fastapi.responses import JSONResponse
        response = JSONResponse({"status": "ok"}, status_code=200)
    else:
        response = await call_next(request)

    # Descobre a origem da requisição para refletir no header
    origin = request.headers.get("origin")
    response.headers["Access-Control-Allow-Origin"] = origin or "*"
    response.headers["Vary"] = ", ".join(filter(None, [response.headers.get("Vary"), "Origin"]))
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    # Como allow_origins é "*", não anunciamos credenciais aqui
    response.headers["Access-Control-Max-Age"] = "3600"

    return response

# Adiciona um endpoint de teste para verificar CORS
@app.get("/test-cors")
async def test_cors():
    return {"message": "CORS está funcionando!"}

def save_wallpaper_to_db(file_data: bytes, filename: str, content_type: str) -> str:
    """Salva a imagem no MongoDB GridFS e retorna o ID do arquivo."""
    try:
        file_id = fs.put(
            file_data,
            filename=filename,
            content_type=content_type,
            # Use timezone-aware UTC to avoid deprecation warning
            upload_date=datetime.datetime.now(datetime.timezone.utc)
        )
        return str(file_id)
    except Exception as e:
        logger.error(f"Erro ao salvar imagem no MongoDB: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao salvar a imagem no banco de dados: {str(e)}"
        )

def get_wallpaper_from_db(file_id: str) -> Dict[str, Any]:
    """Obtém uma imagem do MongoDB GridFS pelo ID."""
    try:
        if not ObjectId.is_valid(file_id):
            raise ValueError("ID de arquivo inválido")
            
        grid_out = fs.get(ObjectId(file_id))
        return {
            "data": grid_out.read(),
            "content_type": grid_out.content_type,
            "filename": grid_out.filename
        }
    except NoFile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Arquivo não encontrado"
        )
    except Exception as e:
        logger.error(f"Erro ao buscar imagem no MongoDB: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao recuperar a imagem: {str(e)}"
        )

def alterar_papel_de_parede_windows(imagem_data: bytes, estilo: str = "preencher") -> bool:
    try:
        if not imagem_data:
            raise ValueError("Dados da imagem não fornecidos")

        # Mapeia estilos para valores do Windows
        estilos = {
            "preencher": 10,  # WPSTYLE_SPAN
            "ajustar": 6,     # WPSTYLE_FIT
            "estender": 10,   # WPSTYLE_SPAN
            "ladrilhar": 0,   # WPSTYLE_TILE
            "centralizar": 0,  # WPSTYLE_CENTER
            "esticar": 2      # WPSTYLE_STRETCH
        }
        
        # Cria um arquivo BMP persistente em %APPDATA% para evitar fallback para cor sólida
        appdata = os.getenv('APPDATA') or os.path.expanduser('~')
        base_dir = os.path.join(appdata, 'WallpaperAgent')
        os.makedirs(base_dir, exist_ok=True)
        bmp_path = os.path.join(base_dir, 'wallpaper.bmp')
        
        # Converte a imagem recebida para BMP (24-bit) e JPG (para Themes) e salva no caminho persistente
        try:
            with Image.open(io.BytesIO(imagem_data)) as im:
                im = im.convert('RGB')
                im.save(bmp_path, format='BMP')
                # Também prepara um JPG de alta qualidade (usado por TranscodedWallpaper)
                jpg_path = os.path.join(base_dir, 'wallpaper.jpg')
                im.save(jpg_path, format='JPEG', quality=92)
        except Exception as e:
            logger.error(f"Falha ao converter imagem para BMP: {e}")
            raise
        
        # Grava o arquivo na pasta de temas do Windows (TranscodedWallpaper) para evitar fallback para cor sólida
        themes_dir = os.path.join(appdata, 'Microsoft', 'Windows', 'Themes')
        try:
            os.makedirs(themes_dir, exist_ok=True)
            transcoded_path = os.path.join(themes_dir, 'TranscodedWallpaper')  # normalmente sem extensão
            # Escreve um JPG sem extensão (Windows lida com isso)
            shutil.copyfile(jpg_path, transcoded_path)
            # Remove Slideshow.ini, se existir, para evitar que o Windows mantenha slideshow habilitado
            slideshow_ini = os.path.join(themes_dir, 'Slideshow.ini')
            try:
                if os.path.exists(slideshow_ini):
                    os.remove(slideshow_ini)
            except Exception as e:
                logger.warning(f"Não foi possível remover Slideshow.ini: {str(e)}")
        except Exception as e:
            logger.warning(f"Não foi possível copiar para Themes/TranscodedWallpaper: {str(e)}. Prosseguindo com bmp_path.")
            transcoded_path = bmp_path

        # Define as constantes do Windows
        SPI_SETDESKWALLPAPER = 0x0014
        SPI_SETDESKWALLPAPER_STYLE = 0x0015
        SPI_SETDESKWALLPAPER_TILE = 0x0016
        SPIF_UPDATEINIFILE = 0x01
        SPIF_SENDCHANGE = 0x02
        
        # Obtém o valor do estilo
        style_value = estilos.get(estilo.lower(), 10)
        
        # Desabilita o modo de apresentação de slides (caso esteja ativo)
        try:
            try:
                key_slideshow = winreg.CreateKey(
                    winreg.HKEY_CURRENT_USER,
                    "Control Panel\\Personalization\\Desktop Slideshow"
                )
                winreg.SetValueEx(key_slideshow, "SlideshowEnabled", 0, winreg.REG_DWORD, 0)
                key_slideshow.Close()
            except Exception as e:
                logger.warning(f"Não foi possível desabilitar slideshow em 'Personalization\\Desktop Slideshow': {str(e)}")
            
            try:
                key_wp = winreg.CreateKey(
                    winreg.HKEY_CURRENT_USER,
                    "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Wallpapers"
                )
                winreg.SetValueEx(key_wp, "SlideshowEnabled", 0, winreg.REG_DWORD, 0)
                key_wp.Close()
            except Exception as e:
                logger.warning(f"Não foi possível desabilitar slideshow em 'Explorer\\Wallpapers': {str(e)}")

            # Algumas versões usam a chave diretamente em Control Panel\Desktop
            try:
                key_cp = winreg.CreateKey(
                    winreg.HKEY_CURRENT_USER,
                    "Control Panel\\Desktop"
                )
                winreg.SetValueEx(key_cp, "SlideshowEnabled", 0, winreg.REG_DWORD, 0)
                key_cp.Close()
            except Exception as e:
                logger.warning(f"Não foi possível desabilitar slideshow em 'Control Panel\\Desktop': {str(e)}")
        except Exception:
            logger.warning("Falha ao tentar desabilitar o modo de apresentação de slides.")

        # Define o estilo (ajuste para diferentes versões do Windows)
        if estilo == "ladrilhar":
            ctypes.windll.user32.SystemParametersInfoW(SPI_SETDESKWALLPAPER_TILE, 1, None, SPIF_UPDATEINIFILE | SPIF_SENDCHANGE)
        else:
            ctypes.windll.user32.SystemParametersInfoW(SPI_SETDESKWALLPAPER_TILE, 0, None, SPIF_UPDATEINIFILE | SPIF_SENDCHANGE)

            # Para Windows 7/8/10/11
            key = winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                "Control Panel\\Desktop",
                0, 
                winreg.KEY_WRITE
            )

            if estilo in ["preencher", "estender"]:
                winreg.SetValueEx(key, "WallpaperStyle", 0, winreg.REG_SZ, "10")
                winreg.SetValueEx(key, "TileWallpaper", 0, winreg.REG_SZ, "0")
            elif estilo == "ajustar":
                winreg.SetValueEx(key, "WallpaperStyle", 0, winreg.REG_SZ, "6")
                winreg.SetValueEx(key, "TileWallpaper", 0, winreg.REG_SZ, "0")
            elif estilo == "esticar":
                winreg.SetValueEx(key, "WallpaperStyle", 0, winreg.REG_SZ, "2")
                winreg.SetValueEx(key, "TileWallpaper", 0, winreg.REG_SZ, "0")
            elif estilo == "centralizar":
                winreg.SetValueEx(key, "WallpaperStyle", 0, winreg.REG_SZ, "0")
                winreg.SetValueEx(key, "TileWallpaper", 0, winreg.REG_SZ, "0")
            # Garante slideshow desabilitado também nesta chave
            try:
                winreg.SetValueEx(key, "SlideshowEnabled", 0, winreg.REG_DWORD, 0)
            except Exception:
                pass
            # Ajusta também PicturePosition (usado por algumas versões)
            picture_position_map = {
                "preencher": "10",   # Fill
                "estender": "22",    # Span (multi-monitor)
                "ajustar": "6",      # Fit
                "esticar": "2",      # Stretch
                "centralizar": "0",  # Center
                "ladrilhar": "0"     # Tile
            }
            try:
                winreg.SetValueEx(key, "PicturePosition", 0, winreg.REG_SZ, picture_position_map.get(estilo, "10"))
            except Exception:
                pass
            # Garante que o valor Wallpaper aponte para o BMP persistente (mais confiável)
            winreg.SetValueEx(key, "Wallpaper", 0, winreg.REG_SZ, bmp_path)
            try:
                winreg.SetValueEx(key, "OriginalWallpaper", 0, winreg.REG_SZ, bmp_path)
            except Exception:
                pass
            key.Close()

        # Define BackgroundType como imagem (1) para evitar cor sólida (2) ou slideshow (3)
        try:
            key_bg = winreg.CreateKey(
                winreg.HKEY_CURRENT_USER,
                "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Wallpapers"
            )
            winreg.SetValueEx(key_bg, "BackgroundType", 0, winreg.REG_DWORD, 1)
            # Alguns ambientes usam ConvertedWallpaper para apontar o arquivo atual
            try:
                winreg.SetValueEx(key_bg, "ConvertedWallpaper", 0, winreg.REG_SZ, bmp_path)
            except Exception:
                pass
            key_bg.Close()
        except Exception as e:
            logger.warning(f"Não foi possível definir BackgroundType=1: {str(e)}")

        # Força a atualização e valida retorno da API
        if not os.path.exists(bmp_path):
            raise RuntimeError(f"Arquivo BMP não encontrado em {bmp_path}")
        # Chama duas vezes para forçar refresh completo
        ctypes.windll.user32.SystemParametersInfoW(
            SPI_SETDESKWALLPAPER,
            0,
            None,
            SPIF_UPDATEINIFILE | SPIF_SENDCHANGE
        )
        res = ctypes.windll.user32.SystemParametersInfoW(
            SPI_SETDESKWALLPAPER,
            0,
            bmp_path,
            SPIF_UPDATEINIFILE | SPIF_SENDCHANGE
        )
        if not res:
            # Captura código de erro do Windows
            err = ctypes.get_last_error()
            logger.error(f"SystemParametersInfoW falhou. GetLastError={err}")
            raise RuntimeError(f"Falha na chamada ao Windows API (erro {err})")
        
        # Se um file_id foi fornecido, armazena no registro do Windows
        if hasattr(alterar_papel_de_parede_windows, 'last_file_id'):
            try:
                key = winreg.OpenKey(
                    winreg.HKEY_CURRENT_USER,
                    "Control Panel\\Desktop",
                    0,
                    winreg.KEY_WRITE
                )
                winreg.SetValueEx(key, "WallpaperMongoID", 0, winreg.REG_SZ, alterar_papel_de_parede_windows.last_file_id)
                
                # Também armazena a data/hora da última alteração
                now = datetime.datetime.now().isoformat()
                winreg.SetValueEx(key, "WallpaperLastChanged", 0, winreg.REG_SZ, now)
                
                key.Close()
                logger.info(f"ID do MongoDB armazenado no registro: {alterar_papel_de_parede_windows.last_file_id}")
            except Exception as e:
                logger.warning(f"Não foi possível armazenar o ID do MongoDB no registro: {str(e)}")
            finally:
                # Limpa o atributo após o uso
                if hasattr(alterar_papel_de_parede_windows, 'last_file_id'):
                    delattr(alterar_papel_de_parede_windows, 'last_file_id')
        
        logger.info(f"Papel de parede alterado (estilo: {estilo})")
        # Expõe o último caminho BMP usado para outros endpoints/retornos
        try:
            alterar_papel_de_parede_windows.last_bmp_path = bmp_path
        except Exception:
            pass
        return True
        

    except Exception as e:
        logger.error(f"Erro ao alterar papel de parede: {str(e)}")
        logger.error(traceback.format_exc())
        raise

@app.on_event("startup")
async def iniciar_agente():
    """Inicia o agente em uma thread separada."""
    logger.info("Iniciando agente em segundo plano...")
    try:
        # Define código único e URL do agente e persiste no Registro
        global MACHINE_CODE, AGENT_URL
        MACHINE_CODE = get_or_create_machine_code()
        ip = get_local_ip()
        AGENT_URL = f"http://{ip}:{PORT}"
        try:
            key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, REGISTRY_PATH)
            winreg.SetValueEx(key, "AgentUrl", 0, winreg.REG_SZ, AGENT_URL)
            winreg.CloseKey(key)
        except Exception:
            pass
        logger.info(f"MachineCode: {MACHINE_CODE} | AgentUrl: {AGENT_URL}")
    except Exception as e:
        logger.warning(f"Falha ao preparar identidade do agente: {e}")

    # Tenta configurar auto start no Windows (HKCU\...\Run)
    try:
        run_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
        cmd = f'"{sys.executable}" "{os.path.abspath(__file__)}"'
        key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, run_path)
        winreg.SetValueEx(key, "WallpaperAgent", 0, winreg.REG_SZ, cmd)
        winreg.CloseKey(key)
        logger.info("Auto-start configurado em HKCU Run")
    except Exception as e:
        logger.warning(f"Não foi possível configurar auto-start: {e}")
    
    # Inicia o registro com o backend, se necessário
    if REGISTRAR_COM_BACKEND:
        threading.Thread(target=registrar_no_backend, daemon=True).start()
    
    # Agenda a limpeza de wallpapers antigos para rodar uma vez por dia
    def schedule_cleanup():
        while True:
            try:
                # Executa a limpeza à meia-noite
                now = datetime.datetime.now()
                next_run = (now + datetime.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
                sleep_seconds = (next_run - now).total_seconds()
                
                logger.info(f"Próxima limpeza de wallpapers antigos agendada para: {next_run}")
                time.sleep(sleep_seconds)
                
                logger.info("Iniciando limpeza de wallpapers antigos...")
                clean_old_wallpapers()
                logger.info("Limpeza de wallpapers antigos concluída")
                
            except Exception as e:
                logger.error(f"Erro no agendador de limpeza: {str(e)}")
                logger.error(traceback.format_exc())
                # Em caso de erro, espera 1 hora antes de tentar novamente
                time.sleep(3600)
    
    # Inicia a thread de limpeza agendada
    threading.Thread(target=schedule_cleanup, daemon=True).start()

def clean_old_wallpapers(days_to_keep: int = 30):
    """
    Remove wallpapers antigos do MongoDB que não estão mais em uso.
    Mantém os wallpapers usados nos últimos 'days_to_keep' dias.
    """
    if not client or not db:
        logger.warning("Não é possível limpar wallpapers antigos: sem conexão com o MongoDB")
        return
    
    try:
        # Obtém a data de corte (hoje - dias para manter)
        cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days_to_keep)
        
        # Encontra os IDs dos wallpapers atuais no registro
        current_wallpapers = set()
        try:
            key = winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                "Control Panel\\Desktop",
                0,
                winreg.KEY_READ
            )
            
            # Obtém todos os valores que podem conter IDs de wallpapers
            for i in range(winreg.QueryInfoKey(key)[1]):
                try:
                    name, value, _ = winreg.EnumValue(key, i)
                    if name == "WallpaperMongoID" and value:
                        current_wallpapers.add(value)
                except WindowsError:
                    continue
                    
            key.Close()
        except Exception as e:
            logger.warning(f"Erro ao ler wallpapers atuais do registro: {str(e)}")
        
        # Encontra wallpapers antigos no GridFS
        fs = GridFS(db)
        old_wallpapers = db.fs.files.find({
            "uploadDate": {"$lt": cutoff_date},
            "_id": {"$nin": [ObjectId(id) for id in current_wallpapers if ObjectId.is_valid(id)]}
        })
        
        # Remove os wallpapers antigos
        deleted_count = 0
        for wp in old_wallpapers:
            try:
                fs.delete(wp["_id"])
                deleted_count += 1
                logger.info(f"Wallpaper antigo removido: {wp['_id']}")
            except Exception as e:
                logger.error(f"Erro ao remover wallpaper {wp['_id']}: {str(e)}")
        
        logger.info(f"Limpeza concluída: {deleted_count} wallpapers antigos removidos")
        
    except Exception as e:
        logger.error(f"Erro durante a limpeza de wallpapers antigos: {str(e)}")
        logger.error(traceback.format_exc())

def get_current_wallpaper() -> tuple[str, str, str]:
    """
    Obtém o papel de parede atual do registro do Windows.
    Retorna uma tupla (wallpaper_info, mongo_id, last_changed).
    """
    try:
        # Abre a chave do registro do Windows para o papel de parede
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            "Control Panel\\Desktop",
            0,
            winreg.KEY_READ
        )
        
        # Obtém o valor atual do papel de parede
        try:
            # A chave correta é 'Wallpaper' (não 'WallPaper')
            wallpaper = winreg.QueryValueEx(key, "Wallpaper")[0]
            wallpaper_info = f"Arquivo local: {wallpaper}" if wallpaper else "Nenhum papel de parede definido"
        except WindowsError:
            wallpaper_info = "Não foi possível obter o caminho do papel de parede"
            wallpaper = ""
            
        # Verifica se há um ID do MongoDB armazenado no registro
        mongo_id = ""
        try:
            mongo_id = winreg.QueryValueEx(key, "WallpaperMongoID")[0]
            if mongo_id:
                wallpaper_info = f"MongoDB ID: {mongo_id}"
        except WindowsError:
            pass  # Se não encontrar o valor, ignora
            
        # Obtém a data da última alteração
        last_changed = ""
        try:
            last_changed = winreg.QueryValueEx(key, "WallpaperLastChanged")[0]
        except WindowsError:
            pass  # Se não encontrar o valor, ignora
            
        key.Close()
        return wallpaper_info, mongo_id, last_changed
        
    except Exception as e:
        logger.warning(f"Não foi possível acessar o registro do Windows: {str(e)}")
        return "Não foi possível obter informações do papel de parede", "", ""

def registrar_no_backend():
    while True:
        try:
            sysinfo = get_system_info()
            dados = {
                "id_agente": ID_AGENTE,
                "codigo": MACHINE_CODE or get_or_create_machine_code(),
                "endereco": (AGENT_URL or sysinfo.get("agent_url") or f"http://{HOST}:{PORT}"),
                "tipo": "wallpaper",
                "device_name": sysinfo.get("device_name"),
                "ip": sysinfo.get("ip"),
                "ram_total_gb": sysinfo.get("ram_total_gb"),
                "storage_total_gb": sysinfo.get("storage_total_gb"),
                "storage_free_gb": sysinfo.get("storage_free_gb"),
                "motherboard": sysinfo.get("motherboard"),
            }
            response = requests.post(
                f"{URL_BACKEND}/registrar",
                json=dados,
                timeout=10
            )
            logger.info(f"Registrado no backend: {response.status_code}")
        except Exception as e:
            logger.error(f"Erro ao registrar no backend: {str(e)}")
        time.sleep(60)

@app.get("/wallpaper/{file_id}")
async def get_wallpaper(file_id: str):
    """
    Obtém uma imagem de papel de parede pelo seu ID no MongoDB.
    """
    try:
        # Valida o ID
        if not ObjectId.is_valid(file_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ID de arquivo inválido"
            )
            
        # Obtém o arquivo do GridFS
        file_obj = get_wallpaper_from_db(file_id)
        if not file_obj or not file_obj.get("data"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Arquivo não encontrado"
            )
            
        # Retorna a imagem como resposta
        return Response(
            content=file_obj["data"],
            media_type=(file_obj.get("content_type") or "image/jpeg"),
            headers={"Cache-Control": "public, max-age=31536000"}  # Cache de 1 ano
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao recuperar imagem: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao recuperar a imagem: {str(e)}"
        )

@app.get("/obter_status")
async def obter_status(request: Request):
    try:
        # Obtém informações do papel de parede atual
        wallpaper_info, mongo_id, last_changed = get_current_wallpaper()
        
        # Verifica a conexão com o MongoDB
        mongo_connected = False
        if client is not None:
            try:
                # O comando ping é leve e rápido, ideal para verificar a conexão
                client.admin.command('ping')
                mongo_connected = True
            except Exception as e:
                logger.warning(f"Falha ao conectar ao MongoDB: {str(e)}")
        
        # Prepara os dados do wallpaper
        wallpaper_data = {
            "info": wallpaper_info,
            "last_changed": last_changed or "Desconhecido"
        }
        
        # Se tivermos um ID do MongoDB, adiciona um link para a imagem
        if mongo_id:
            # Monta a URL da imagem com base no host da requisição
            try:
                scheme = request.url.scheme or "http"
                host_header = request.headers.get("host")
                if not host_header:
                    # Fallback para IP do cliente + porta do app
                    client_host = getattr(request.client, 'host', 'localhost')
                    host_header = f"{client_host}:{PORT}"
                wallpaper_data["image_url"] = f"{scheme}://{host_header}/wallpaper/{mongo_id}"
            except Exception:
                wallpaper_data["image_url"] = f"http://localhost:{PORT}/wallpaper/{mongo_id}"
            # Tenta obter o nome do arquivo salvo no GridFS
            try:
                file_obj = fs.get(ObjectId(mongo_id))
                if getattr(file_obj, 'filename', None):
                    wallpaper_data["file_name"] = file_obj.filename
            except Exception:
                pass
        
        # Infos da máquina
        sysinfo = get_system_info()
        desktop_name = sysinfo.get("device_name") or os.environ.get("COMPUTERNAME") or platform.node() or "Desconhecido"

        return {
            "status": "online",
            "id_agente": ID_AGENTE,
            "versao": "1.0.0",
            "wallpaper": wallpaper_data,
            "timestamp": datetime.datetime.now().isoformat(),
            "mongo_connected": mongo_connected,
            "desktop": desktop_name,
            "machine_code": MACHINE_CODE or get_or_create_machine_code(),
            "agent_url": AGENT_URL or sysinfo.get("agent_url"),
            "ip": sysinfo.get("ip"),
            "hardware": {
                "ram_total_gb": sysinfo.get("ram_total_gb"),
                "storage_total_gb": sysinfo.get("storage_total_gb"),
                "storage_free_gb": sysinfo.get("storage_free_gb"),
                "motherboard": sysinfo.get("motherboard"),
            }
        }
    except Exception as e:
        logger.error(f"Erro ao obter status: {str(e)}")
        logger.error(traceback.format_exc())
        return {
            "status": "erro",
            "id_agente": ID_AGENTE,
            "versao": "1.0.0",
            "erro": "Não foi possível obter informações do papel de parede",
            "detalhes": str(e),
            "mongo_connected": client is not None and client.admin.command('ping').get('ok') == 1.0
        }

@app.post("/alterar_papel_de_parede")
async def alterar_papel_de_parede(file: UploadFile = File(...), estilo: str = Form(...)):
    try:
        # Verifica se o arquivo é uma imagem
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O arquivo deve ser uma imagem"
            )
            
        # Verifica o estilo
        if estilo not in ["preencher", "ajustar", "estender", "ladrilhar", "centralizar", "esticar"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Estilo inválido. Use: preencher, ajustar, estender, ladrilhar, centralizar ou esticar"
            )
        
        # Lê o conteúdo do arquivo
        try:
            file_content = await file.read()
            if not file_content:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Arquivo vazio"
                )
                
            # Salva a imagem no MongoDB
            file_id = save_wallpaper_to_db(
                file_content,
                filename=file.filename or "wallpaper.jpg",
                content_type=file.content_type or "image/jpeg"
            )
            
            # Define o papel de parede e armazena o file_id no atributo da função
            alterar_papel_de_parede_windows.last_file_id = file_id
            if alterar_papel_de_parede_windows(file_content, estilo):
                logger.info("Papel de parede alterado com sucesso")
                bmp_used = getattr(alterar_papel_de_parede_windows, 'last_bmp_path', None)
                return {
                    "status": "sucesso",
                    "mensagem": "Papel de parede alterado com sucesso!",
                    "file_id": file_id,
                    "estilo": estilo,
                    "bmp_path": bmp_used
                }
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Falha ao alterar o papel de parede"
                )
                
        except Exception as e:
            logger.error(f"Erro ao processar o arquivo: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao processar o arquivo: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro inesperado: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar a requisição: {str(e)}"
        )
    finally:
        # Fecha o arquivo se ainda estiver aberto
        if file and hasattr(file, 'file') and not file.file.closed:
            await file.close()

@app.post("/forcar_refresh")
async def forcar_refresh():
    try:
        # Determina o caminho BMP a ser usado
        appdata = os.getenv('APPDATA') or os.path.expanduser('~')
        base_dir = os.path.join(appdata, 'WallpaperAgent')
        default_bmp = os.path.join(base_dir, 'wallpaper.bmp')
        bmp_path = getattr(alterar_papel_de_parede_windows, 'last_bmp_path', default_bmp)

        if not os.path.exists(bmp_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Arquivo BMP não encontrado em {bmp_path}"
            )

        # Reaplica chaves de registro mínimas e força atualização
        SPI_SETDESKWALLPAPER = 0x0014
        SPIF_UPDATEINIFILE = 0x01
        SPIF_SENDCHANGE = 0x02

        # Control Panel\Desktop
        try:
            key = winreg.OpenKey(
                winreg.HKEY_CURRENT_USER,
                "Control Panel\\Desktop",
                0,
                winreg.KEY_WRITE
            )
            winreg.SetValueEx(key, "Wallpaper", 0, winreg.REG_SZ, bmp_path)
            try:
                winreg.SetValueEx(key, "OriginalWallpaper", 0, winreg.REG_SZ, bmp_path)
            except Exception:
                pass
            key.Close()
        except Exception as e:
            logger.warning(f"Falha ao escrever Control Panel\\Desktop: {e}")

        # Explorer\Wallpapers
        try:
            key_bg = winreg.CreateKey(
                winreg.HKEY_CURRENT_USER,
                "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Wallpapers"
            )
            try:
                winreg.SetValueEx(key_bg, "BackgroundType", 0, winreg.REG_DWORD, 1)
            except Exception:
                pass
            try:
                winreg.SetValueEx(key_bg, "ConvertedWallpaper", 0, winreg.REG_SZ, bmp_path)
            except Exception:
                pass
            key_bg.Close()
        except Exception as e:
            logger.warning(f"Falha ao escrever Explorer\\Wallpapers: {e}")

        # Força atualização
        ctypes.windll.user32.SystemParametersInfoW(
            SPI_SETDESKWALLPAPER,
            0,
            None,
            SPIF_UPDATEINIFILE | SPIF_SENDCHANGE
        )
        res = ctypes.windll.user32.SystemParametersInfoW(
            SPI_SETDESKWALLPAPER,
            0,
            bmp_path,
            SPIF_UPDATEINIFILE | SPIF_SENDCHANGE
        )
        if not res:
            err = ctypes.get_last_error()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Falha na chamada ao Windows API (erro {err})"
            )

        return {
            "status": "sucesso",
            "mensagem": "Refresh do papel de parede forçado com sucesso",
            "bmp_path": bmp_path
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao forçar refresh: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao forçar refresh: {str(e)}"
        )

if __name__ == "__main__":
    try:
        logger.info("="*50)
        logger.info("Iniciando o agente...")
        logger.info(f"ID do agente: {ID_AGENTE}")
        logger.info(f"URL do backend: {URL_BACKEND}")
        logger.info(f"Registrando com o backend: {REGISTRAR_COM_BACKEND}")
        logger.info(f"Endereço do servidor: http://{HOST}:{PORT}")
        
        # Inicia o servidor FastAPI
        import uvicorn
        
        # Eventos de startup são gerenciados pelo FastAPI (@app.on_event("startup"))
        # portanto não chamamos iniciar_agente() diretamente aqui.

        # Inicia o servidor FastAPI
        uvicorn.run(
            app,
            host=HOST,
            port=PORT,
            log_level="info",
            reload=False
        )
        
    except Exception as e:
        logger.error("="*50)
        logger.error("ERRO CRÍTICO")
        logger.error("="*50)
        logger.error(f"Tipo do erro: {type(e).__name__}")
        logger.error(f"Mensagem: {str(e)}")
        logger.error("Traceback completo:")
        logger.error(traceback.format_exc())
        logger.error("="*50)
        
        input("Pressione Enter para sair...")
        sys.exit(1)