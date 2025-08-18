# agent.py
import os, io, sys, csv, time, json, shutil, ctypes, socket, hashlib, platform, datetime, logging, traceback, subprocess
from logging.handlers import RotatingFileHandler
from typing import Optional, Dict, Any, Tuple, List

from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form, Response, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings
from bson import ObjectId
from pymongo import MongoClient, ASCENDING
from pymongo.errors import ConnectionFailure, DuplicateKeyError
from gridfs import GridFS, NoFile
from PIL import Image
from typing import List as _List

# ============== CONFIG / SETTINGS ==============

def _writable_dir() -> str:
    cands = [
        os.path.join(os.environ.get('PROGRAMDATA', ''), 'WallpaperAgent', 'logs'),
        os.path.join(os.environ.get('APPDATA', ''), 'WallpaperAgent', 'logs'),
        os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'WallpaperAgent', 'logs'),
        os.path.dirname(os.path.abspath(sys.argv[0])),
        os.getcwd()
    ]
    for d in cands:
        if not d: continue
        try:
            os.makedirs(d, exist_ok=True)
            p = os.path.join(d, '.w')
            with open(p, 'w', encoding='utf-8') as f: f.write('ok')
            os.remove(p)
            return d
        except: pass
    return os.getcwd()

LOG_DIR = _writable_dir()
logger = logging.getLogger("WallpaperAgent")
logger.setLevel(logging.INFO)
handler = RotatingFileHandler(os.path.join(LOG_DIR, "wallpaper_agent.log"), maxBytes=2*1024*1024, backupCount=5, encoding="utf-8")
handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
logger.addHandler(handler)
logger.addHandler(logging.StreamHandler())

REGISTRY_PATH = r"Software\WallpaperAgent"

class _Defaults(BaseSettings):
    PORT: int = 8002
    HOST: str = "0.0.0.0"
    PUBLIC_HOST: str = "localhost"
    ID_AGENTE: str = "agente-wallpaper-001"
    REGISTRAR_COM_BACKEND: bool = False
    URL_BACKEND: str = "http://localhost:5000/api/agentes"

    # Mongo
    MONGO_URI: str = "mongodb+srv://frontend-puro:redefacil@frontend-puro.gblsaeh.mongodb.net/frontend-puro?retryWrites=true&w=majority&appName=frontend-puro"  # obrigatório em produção (via Registro, config.json, .env)
    DB_NAME: str = "inventory_management"
    WALLPAPER_COLLECTION: str = "wallpapers"

    # Segurança
    AGENT_KEY: Optional[str] = None  # quando presente, exige X-AGENT-KEY nas rotas sensíveis
    USER_ID: Optional[str] = None    # usuário associado a esta máquina (opcional)

    # Limpeza
    DAYS_TO_KEEP: int = 30

    class Config:
        env_file = ".env"
        extra = "ignore"

def _read_registry_values(names: List[str]) -> Dict[str, Any]:
    try:
        import winreg
        k = winreg.OpenKey(winreg.HKEY_CURRENT_USER, REGISTRY_PATH, 0, winreg.KEY_READ)
        vals = {}
        for name in names:
            try:
                v, _ = winreg.QueryValueEx(k, name)
                if name in ["PORT", "DAYS_TO_KEEP"]:
                    try: v = int(v)
                    except: pass
                vals[name] = v
            except: pass
        k.Close()
        return vals
    except: return {}

def _write_registry_value(name: str, value: str):
    try:
        import winreg
        k = winreg.CreateKey(winreg.HKEY_CURRENT_USER, REGISTRY_PATH)
        winreg.SetValueEx(k, name, 0, winreg.REG_SZ, str(value))
        k.Close()
    except Exception as e:
        logger.warning(f"Falha ao gravar {name} no Registro: {e}")

def _persist_overrides(**kwargs):
    """Persiste chaves no Registro e tenta refletir em ProgramData/config.json.
    Apenas chaves simples como strings/ints.
    """
    # Registro
    for k, v in kwargs.items():
        try:
            _write_registry_value(str(k), str(v))
        except Exception as e:
            logger.warning(f"Persistência Registro {k}: {e}")
    # ProgramData/config.json
    try:
        cfg_dir = os.path.join(os.environ.get('PROGRAMDATA', ''), "WallpaperAgent")
        os.makedirs(cfg_dir, exist_ok=True)
        cfg_path = os.path.join(cfg_dir, "config.json")
        data = {}
        if os.path.exists(cfg_path):
            try:
                with open(cfg_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            except Exception: data = {}
        data.update({k: v for k, v in kwargs.items()})
        with open(cfg_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"Persistência ProgramData: {e}")

def _load_settings() -> _Defaults:
    # 1) defaults + .env
    s = _Defaults()

    # 2) config.json de ProgramData (se existir)
    cfg_path = os.path.join(os.environ.get('PROGRAMDATA', ''), "WallpaperAgent", "config.json")
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            s = _Defaults(**{**s.model_dump(), **data})
        except Exception as e:
            logger.warning(f"Falha ao ler {cfg_path}: {e}")

    # 3) Registro (sobrepõe)
    overrides = _read_registry_values([
        "PORT","HOST","PUBLIC_HOST","ID_AGENTE","REGISTRAR_COM_BACKEND","URL_BACKEND",
        "MONGO_URI","DB_NAME","WALLPAPER_COLLECTION","AGENT_KEY","DAYS_TO_KEEP"
    ])
    if overrides:
        # converter bool quando vier como string "True"/"False"
        if "REGISTRAR_COM_BACKEND" in overrides and isinstance(overrides["REGISTRAR_COM_BACKEND"], str):
            overrides["REGISTRAR_COM_BACKEND"] = overrides["REGISTRAR_COM_BACKEND"].lower() in ("1","true","yes","on")
        s = _Defaults(**{**s.model_dump(), **overrides})

    # 4) Se não houver AGENT_KEY, gera e grava (recomendado)
    if not s.AGENT_KEY:
        try:
            gen = hashlib.sha256(os.urandom(32)).hexdigest()[:32]
            _write_registry_value("AGENT_KEY", gen)
            s = _Defaults(**{**s.model_dump(), "AGENT_KEY": gen})
            logger.info("AGENT_KEY gerado e salvo no Registro.")
        except Exception as e:
            logger.warning(f"Não foi possível gerar AGENT_KEY: {e}")

    # Aviso sobre MONGO_URI ausente
    if not s.MONGO_URI:
        logger.warning("MONGO_URI está vazio! Defina via Registro/ProgramData/.env antes de produção.")
    return s

S = _load_settings()

# ============== IDENTIDADE / SISTEMA ==============

def _machine_guid() -> str:
    try:
        import winreg
        k = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Cryptography", 0,
                           winreg.KEY_READ | getattr(winreg, 'KEY_WOW64_64KEY', 0))
        v, _ = winreg.QueryValueEx(k, "MachineGuid"); k.Close(); return str(v)
    except: return ""

def _code_from_guid(g: str) -> str:
    if not g: g = platform.node() or "unknown"
    d = hashlib.sha1(g.encode()).hexdigest()
    return f"{int(d[-9:], 16)%100000:05d}"

def get_or_create_machine_code() -> str:
    try:
        import winreg
        try:
            k = winreg.OpenKey(winreg.HKEY_CURRENT_USER, REGISTRY_PATH, 0, winreg.KEY_READ)
            code, _ = winreg.QueryValueEx(k, "MachineCode"); k.Close()
            if isinstance(code, str) and len(code) == 5: return code
        except: pass
        comp = _code_from_guid(_machine_guid())
        _write_registry_value("MachineCode", comp)
        return comp
    except:
        return f"{int(time.time())%100000:05d}"

def local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]; s.close(); return ip
    except:
        try: return socket.gethostbyname(socket.gethostname())
        except: return "127.0.0.1"

def _bytes_to_gb(n: int) -> float:
    return round(n/(1024**3),2) if n else 0.0

def motherboard_info() -> Dict[str, Any]:
    info = {"manufacturer": None, "product": None, "serial": None}
    try:
        r = subprocess.run(["wmic","baseboard","get","Manufacturer,Product,SerialNumber","/format:csv"],
                           capture_output=True, text=True, timeout=5)
        if r.returncode==0 and r.stdout:
            lines = [l for l in (x.strip() for x in r.stdout.splitlines()) if l]
            if len(lines)>=2:
                hdr = [h.strip().lower() for h in lines[0].split(',')]
                val = [v.strip() for v in lines[1].split(',')]
                m = dict(zip(hdr,val))
                info.update({"manufacturer":m.get("manufacturer"),"product":m.get("product"),"serial":m.get("serialnumber")})
    except: pass
    return info

def cpu_info() -> Dict[str, Any]:
    info = {"name": None, "cores": None, "threads": None}
    try:
        r = subprocess.run(["wmic","cpu","get","Name,NumberOfCores,NumberOfLogicalProcessors","/format:csv"],
                           capture_output=True, text=True, timeout=5)
        if r.returncode==0 and r.stdout:
            lines = [l for l in (x.strip() for x in r.stdout.splitlines()) if l]
            if len(lines)>=2:
                hdr = [h.strip().lower() for h in lines[0].split(',')]
                val = [v.strip() for v in lines[1].split(',')]
                m = dict(zip(hdr,val))
                info["name"]=m.get("name")
                info["cores"]= int(m.get("numberofcores")) if m.get("numberofcores") else None
                info["threads"]= int(m.get("numberoflogicalprocessors")) if m.get("numberoflogicalprocessors") else None
    except:
        try: info["name"]=platform.processor() or None
        except: pass
    return info

def system_info(PORT:int) -> Dict[str,Any]:
    info: Dict[str,Any] = {}
    try:
        info["device_name"] = os.environ.get("COMPUTERNAME") or platform.node() or "Desconhecido"
        # RAM
        try:
            import psutil
            info["ram_total_gb"] = _bytes_to_gb(psutil.virtual_memory().total)
        except:
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_=[("dwLength", ctypes.c_ulong),("dwMemoryLoad", ctypes.c_ulong),
                          ("ullTotalPhys", ctypes.c_ulonglong),("ullAvailPhys", ctypes.c_ulonglong),
                          ("ullTotalPageFile", ctypes.c_ulonglong),("ullAvailPageFile", ctypes.c_ulonglong),
                          ("ullTotalVirtual", ctypes.c_ulonglong),("ullAvailVirtual", ctypes.c_ulonglong),
                          ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]
            st = MEMORYSTATUSEX(); st.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(st))
            info["ram_total_gb"] = _bytes_to_gb(st.ullTotalPhys)
        # Disco
        try: total, used, free = shutil.disk_usage(os.getenv('SystemDrive') + "\\")
        except: total, used, free = shutil.disk_usage("/")
        info["storage_total_gb"]=_bytes_to_gb(total); info["storage_free_gb"]=_bytes_to_gb(free)
        # MB e CPU
        info["motherboard"]=motherboard_info(); info["cpu"]=cpu_info()
        ip = local_ip(); info["ip"]=ip; info["agent_url"]=f"http://{ip}:{PORT}"
    except Exception as e:
        logger.warning(f"Falha ao coletar informações do sistema: {e}")
    return info

# ============== DB / GRIDFS (com índice de dedupe) ==============

class DB:
    client: MongoClient = None
    fs: GridFS = None
    def init(self):
        if self.client: return
        if not S.MONGO_URI:
            logger.warning("Iniciando sem MONGO_URI — chamadas ao DB irão falhar.")
        self.client = MongoClient(S.MONGO_URI) if S.MONGO_URI else MongoClient()  # evita crash em dev
        try:
            self.client.admin.command("ping")
            logger.info("MongoDB ping OK")
        except Exception as e:
            logger.error(f"Falha ao conectar ao MongoDB: {e}")
            raise

        db = self.client[S.DB_NAME]
        # IMPORTANT: como usamos GridFS custom collection, os nomes ficam <coll>.files / <coll>.chunks
        files = db[f"{S.WALLPAPER_COLLECTION}.files"]
        # Índices úteis
        try:
            # Torna o índice único apenas quando metadata.sha256 é string (evita colisão com null)
            files.create_index(
                [("metadata.sha256", 1)],
                name="uniq_sha256",
                unique=True,
                background=True,
                partialFilterExpression={"metadata.sha256": {"$type": "string"}},
            )
        except Exception as e:
            logger.warning(f"Índice uniq_sha256: {e}")
        try:
            files.create_index([("metadata.lastUsedAt", 1)], background=True)
        except Exception as e:
            logger.warning(f"Índice lastUsedAt: {e}")
        try:
            files.create_index([("uploadDate", 1)], background=True)
        except Exception as e:
            logger.warning(f"Índice uploadDate: {e}")

        self.fs = GridFS(db, collection=S.WALLPAPER_COLLECTION)
        logger.info("GridFS pronto")

DBI = DB()
DBI.init()

def _compute_sha256(data: bytes) -> str:
    h = hashlib.sha256(); h.update(data); return h.hexdigest()

def save_img_dedup(data: bytes, filename: str, content_type: str) -> str:
    sha = _compute_sha256(data)
    db = DBI.client[S.DB_NAME]
    files = db[f"{S.WALLPAPER_COLLECTION}.files"]

    # Existe?
    doc = files.find_one({"metadata.sha256": sha}, {"_id": 1})
    if doc:
        return str(doc["_id"])

    # Não existe: salva
    try:
        fid = DBI.fs.put(
            data,
            filename=filename or "wallpaper.jpg",
            content_type=content_type or "image/jpeg",
            metadata={
                "sha256": sha,
                "bytes": len(data),
                "uploadedAt": datetime.datetime.now(datetime.timezone.utc),
                "lastUsedAt": None,
            },
            uploadDate=datetime.datetime.now(datetime.timezone.utc),
        )
        return str(fid)
    except DuplicateKeyError:
        # corrida rara: alguém inseriu no meio
        doc = files.find_one({"metadata.sha256": sha}, {"_id": 1})
        if doc:
            return str(doc["_id"])
        raise
    except Exception as e:
        logger.exception("Erro ao salvar imagem no GridFS")
        raise HTTPException(status_code=500, detail=f"Erro ao salvar a imagem: {e}")

def mark_wallpaper_used(file_id: str):
    try:
        db = DBI.client[S.DB_NAME]
        files = db[f"{S.WALLPAPER_COLLECTION}.files"]
        files.update_one(
            {"_id": ObjectId(file_id)},
            {"$set": {"metadata.lastUsedAt": datetime.datetime.now(datetime.timezone.utc)}}
        )
    except Exception as e:
        logger.warning(f"Não foi possível marcar lastUsedAt para {file_id}: {e}")

def read_img(file_id: str) -> Dict[str,Any]:
    try:
        if not ObjectId.is_valid(file_id): raise ValueError("ID inválido")
        f = DBI.fs.get(ObjectId(file_id))
        return {"data": f.read(), "content_type": f.content_type or "image/jpeg", "filename": f.filename}
    except NoFile:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    except Exception as e:
        logger.exception("Erro ao recuperar imagem")
        raise HTTPException(status_code=500, detail=f"Erro ao recuperar a imagem: {e}")

# ============== SEGURANÇA OPCIONAL (X-AGENT-KEY) ==============

def require_key(x_agent_key: Optional[str] = None):
    # Dependência manual (usamos manualmente para ter compatibilidade com FastAPI antigo de Form)
    if S.AGENT_KEY and x_agent_key != S.AGENT_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")

# ============== INTEGRAÇÃO USUÁRIO/MÁQUINA ==============

# ============== WINDOWS WALLPAPER ==============

class WinWP:
    last_bmp_path: Optional[str] = None
    last_file_id: Optional[str] = None

    @staticmethod
    def set_wallpaper(img_bytes: bytes, estilo: str = "preencher") -> bool:
        import winreg
        if not img_bytes: raise ValueError("Imagem vazia")
        estilos = {"preencher":10,"ajustar":6,"estender":10,"ladrilhar":0,"centralizar":0,"esticar":2}
        appdata = os.getenv('APPDATA') or os.path.expanduser('~')
        base = os.path.join(appdata, 'WallpaperAgent'); os.makedirs(base, exist_ok=True)
        bmp = os.path.join(base, 'wallpaper.bmp'); jpg = os.path.join(base, 'wallpaper.jpg')

        # Converter (Pillow)
        with Image.open(io.BytesIO(img_bytes)) as im:
            im = im.convert('RGB')
            im.save(bmp, format='BMP')
            im.save(jpg, format='JPEG', quality=92)

        # Themes/TranscodedWallpaper
        themes = os.path.join(appdata, 'Microsoft','Windows','Themes')
        try:
            os.makedirs(themes, exist_ok=True)
            shutil.copyfile(jpg, os.path.join(themes,'TranscodedWallpaper'))
            try: os.remove(os.path.join(themes,'Slideshow.ini'))
            except: pass
        except Exception as e:
            logger.warning(f"TranscodedWallpaper: {e}")

        SPI_SETDESKWALLPAPER=0x0014; SPI_SETDESKWALLPAPER_TILE=0x0016; SPIF_UPDATEINIFILE=0x01; SPIF_SENDCHANGE=0x02

        # ladrilhar on/off
        ctypes.windll.user32.SystemParametersInfoW(SPI_SETDESKWALLPAPER_TILE, 1 if estilo=="ladrilhar" else 0, None, SPIF_UPDATEINIFILE|SPIF_SENDCHANGE)

        # Control Panel\Desktop
        k = winreg.CreateKey(winreg.HKEY_CURRENT_USER,"Control Panel\\Desktop")
        if   estilo in ["preencher","estender"]:  winreg.SetValueEx(k,"WallpaperStyle",0,winreg.REG_SZ,"10")
        elif estilo=="ajustar":                   winreg.SetValueEx(k,"WallpaperStyle",0,winreg.REG_SZ,"6")
        elif estilo=="esticar":                   winreg.SetValueEx(k,"WallpaperStyle",0,winreg.REG_SZ,"2")
        elif estilo in ["centralizar","ladrilhar"]: winreg.SetValueEx(k,"WallpaperStyle",0,winreg.REG_SZ,"0")
        winreg.SetValueEx(k,"TileWallpaper",0,winreg.REG_SZ,"1" if estilo=="ladrilhar" else "0")
        try: winreg.SetValueEx(k,"SlideshowEnabled",0,winreg.REG_DWORD,0)
        except: pass
        try:
            winreg.SetValueEx(k,"PicturePosition",0,winreg.REG_SZ,
                              {"preencher":"10","estender":"22","ajustar":"6","esticar":"2","centralizar":"0","ladrilhar":"0"}.get(estilo,"10"))
        except: pass
        winreg.SetValueEx(k,"Wallpaper",0,winreg.REG_SZ,bmp)
        try: winreg.SetValueEx(k,"OriginalWallpaper",0,winreg.REG_SZ,bmp)
        except: pass
        if WinWP.last_file_id:
            try:
                winreg.SetValueEx(k,"WallpaperMongoID",0,winreg.REG_SZ,WinWP.last_file_id)
                winreg.SetValueEx(k,"WallpaperLastChanged",0,winreg.REG_SZ,datetime.datetime.now().isoformat())
            except: pass
        k.Close()

        # Explorer\Wallpapers
        try:
            kb = winreg.CreateKey(winreg.HKEY_CURRENT_USER,"Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Wallpapers")
            try: kb_val = 1; ctypes.c_int(kb_val)  # dummy só pra não dar lint
            except: pass
            try: 
                import winreg as wr
                winreg.SetValueEx(kb,"BackgroundType",0,wr.REG_DWORD,1)
            except: pass
            try: winreg.SetValueEx(kb,"ConvertedWallpaper",0,winreg.REG_SZ,bmp)
            except: pass
            kb.Close()
        except Exception as e:
            logger.warning(f"Explorer\\Wallpapers: {e}")

        if not os.path.exists(bmp):
            raise RuntimeError(f"BMP não encontrado: {bmp}")

        ctypes.windll.user32.SystemParametersInfoW(SPI_SETDESKWALLPAPER,0,None,SPIF_UPDATEINIFILE|SPIF_SENDCHANGE)
        ok = ctypes.windll.user32.SystemParametersInfoW(SPI_SETDESKWALLPAPER,0,bmp,SPIF_UPDATEINIFILE|SPIF_SENDCHANGE)
        if not ok:
            raise RuntimeError(f"SPI falhou (erro {ctypes.get_last_error()})")

        WinWP.last_bmp_path = bmp
        return True

def get_current_wallpaper() -> Tuple[str,str,str]:
    try:
        import winreg
        k = winreg.OpenKey(winreg.HKEY_CURRENT_USER,"Control Panel\\Desktop",0,winreg.KEY_READ)
        try: path = winreg.QueryValueEx(k,"Wallpaper")[0]; info = f"Arquivo local: {path}" if path else "Nenhum"
        except: info, path = "Não foi possível obter", ""
        try: mid = winreg.QueryValueEx(k,"WallpaperMongoID")[0]
        except: mid = ""
        if mid: info = f"MongoDB ID: {mid}"
        try: last = winreg.QueryValueEx(k,"WallpaperLastChanged")[0]
        except: last = ""
        k.Close(); return info, mid, last
    except Exception as e:
        logger.warning(f"Registro: {e}")
        return "Não foi possível obter informações do papel de parede","", ""

# ============== WOL / UTILS ==============

def macs() -> List[str]:
    out = []
    try:
        r = subprocess.run(["getmac","/fo","csv","/v"], capture_output=True, text=True, timeout=5)
        if r.returncode==0 and r.stdout:
            lines=[l for l in (x.strip() for x in r.stdout.splitlines()) if l]
            rdr = csv.reader(lines); hdr = next(rdr,[])
            idx = next((i for i,h in enumerate(hdr) if h.lower().startswith("physical address")), None)
            if idx is not None:
                for row in rdr:
                    mac=row[idx].strip().replace('-' ,':')
                    if mac and mac!='N/A' and mac not in out: out.append(mac)
    except: pass
    try:
        import uuid
        node = uuid.getnode()
        if node and (node>>40)%2==0:
            mac=':'.join([f"{(node>>e)&0xff:02x}" for e in range(40,-1,-8)])
            if mac not in out: out.append(mac)
    except: pass
    return out

def send_magic_packet(mac: str, broadcast: str='255.255.255.255', port:int=9):
    m = mac.replace('-','').replace(':','').replace(' ','')
    if len(m)!=12: raise ValueError("MAC inválido")
    data = bytes.fromhex('FF'*6 + m*16)
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    s.sendto(data, (broadcast, port)); s.close()

# ============== FASTAPI ==============

app = FastAPI(title="Wallpaper Agent API", version="1.0.0", description="API para gerenciamento de papel de parede")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=False, allow_methods=["*"], allow_headers=["*"])

MACHINE_CODE = get_or_create_machine_code()
AGENT_URL = f"http://{local_ip()}:{S.PORT}"

# ============== INTEGRAÇÃO USUÁRIO/MÁQUINA ==============

@app.get("/bootstrap")
def bootstrap():
    """Retorna informações da máquina e a agent key para auto-preenchimento no frontend.
    Observação: esta API expõe a chave localmente; use apenas em ambiente controlado.
    """
    sysi = system_info(S.PORT)
    return {
        "machine_code": MACHINE_CODE,
        "device_name": sysi.get("device_name"),
        "agent_key": S.AGENT_KEY,
        "user_id": S.USER_ID,
        "agent_url": AGENT_URL,
    }

@app.post("/set_user")
def set_user(user_id: str, agent_key: Optional[str] = None):
    """Associa um usuário a esta máquina e opcionalmente define AGENT_KEY.
    Persiste no Registro e ProgramData/config.json.
    """
    try:
        updates = {"USER_ID": user_id}
        if agent_key:
            updates["AGENT_KEY"] = agent_key
        _persist_overrides(**updates)
        # Atualiza em runtime também
        global S
        S = _Defaults(**{**S.model_dump(), **updates})
        return {"ok": True, "user_id": S.USER_ID, "agent_key_set": bool(agent_key)}
    except Exception as e:
        logger.exception("Erro em /set_user")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def root():
    return {"message":"Wallpaper Agent API está rodando!","endpoints":{"test_cors":"/test-cors","obter_status":"/obter_status","alterar_papel_de_parede":"/alterar_papel_de_parede"},"status":"online","timestamp":datetime.datetime.now().isoformat()}

@app.get("/test-cors")
def test_cors(): return {"message":"CORS está funcionando!"}

@app.get("/wallpaper/{file_id}")
def get_wallpaper(file_id: str):
    obj = read_img(file_id)
    return Response(content=obj["data"], media_type=obj["content_type"], headers={"Cache-Control":"public, max-age=31536000"})

@app.get("/obter_status")
def obter_status(request: Request):
    info, mid, last = get_current_wallpaper()
    mongo_ok = False
    try: DBI.client.admin.command("ping"); mongo_ok=True
    except Exception as e: logger.warning(f"Mongo ping: {e}")

    wall = {"info":info, "last_changed": last or "Desconhecido"}
    if mid:
        try:
            scheme = request.url.scheme or "http"
            host = request.headers.get("host") or f"{getattr(request.client,'host','localhost')}:{S.PORT}"
            wall["image_url"] = f"{scheme}://{host}/wallpaper/{mid}"
            f = DBI.fs.get(ObjectId(mid))
            if getattr(f,'filename',None): wall["file_name"]=f.filename
        except: pass

    sysi = system_info(S.PORT)
    return {
        "status":"online","id_agente":S.ID_AGENTE,"versao":"1.0.0",
        "wallpaper":wall,"timestamp":datetime.datetime.now().isoformat(),
        "mongo_connected":mongo_ok,"desktop": sysi.get("device_name"),
        "machine_code":MACHINE_CODE,"agent_url":AGENT_URL or sysi.get("agent_url"),
        "ip": sysi.get("ip"), "macs": macs(), "hardware":{
            "ram_total_gb":sysi.get("ram_total_gb"),"storage_total_gb":sysi.get("storage_total_gb"),
            "storage_free_gb":sysi.get("storage_free_gb"),"motherboard":sysi.get("motherboard"),"cpu":sysi.get("cpu"),
        }
    }

@app.post("/wol")
def wake_on_lan(mac: str = Form(...)):
    send_magic_packet(mac)
    return {"ok": True, "message": f"Magic packet enviado para {mac}"}

@app.post("/shutdown")
def shutdown_machine(x_agent_key: Optional[str] = None):
    require_key(x_agent_key)
    r = subprocess.run(["shutdown","/s","/t","0"], capture_output=True, text=True)
    if r.returncode!=0: raise HTTPException(status_code=500, detail=r.stderr or "Falha ao executar shutdown")
    return {"ok": True, "message": "Comando de desligar enviado"}

@app.post("/alterar_papel_de_parede")
async def alterar_papel_de_parede(file: UploadFile = File(...), estilo: str = Form(...), x_agent_key: Optional[str] = None):
    require_key(x_agent_key)
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="O arquivo deve ser uma imagem")
    if estilo not in ["preencher","ajustar","estender","ladrilhar","centralizar","esticar"]:
        raise HTTPException(status_code=400, detail="Estilo inválido. Use: preencher, ajustar, estender, ladrilhar, centralizar ou esticar")
    try:
        data = await file.read()
        if not data: raise HTTPException(status_code=400, detail="Arquivo vazio")

        file_id = save_img_dedup(data, filename=file.filename or "wallpaper.jpg", content_type=file.content_type or "image/jpeg")

        WinWP.last_file_id = file_id
        if WinWP.set_wallpaper(data, estilo):
            mark_wallpaper_used(file_id)
            bmp_used = WinWP.last_bmp_path
            return {"status":"sucesso","mensagem":"Papel de parede alterado com sucesso!","file_id":file_id,"estilo":estilo,"bmp_path":bmp_used}
        raise HTTPException(status_code=500, detail="Falha ao alterar o papel de parede")
    except HTTPException: raise
    except Exception as e:
        logger.exception("Erro ao processar o arquivo")
        raise HTTPException(status_code=500, detail=f"Erro ao processar o arquivo: {e}")
    finally:
        try: await file.close()
        except: pass

@app.post("/forcar_refresh")
def forcar_refresh():
    appdata = os.getenv('APPDATA') or os.path.expanduser('~')
    bmp = WinWP.last_bmp_path or os.path.join(appdata,'WallpaperAgent','wallpaper.bmp')
    if not os.path.exists(bmp): raise HTTPException(status_code=404, detail=f"BMP não encontrado em {bmp}")
    SPI=0x0014; SPIF=0x01|0x02
    ctypes.windll.user32.SystemParametersInfoW(SPI,0,None,SPIF)
    ok = ctypes.windll.user32.SystemParametersInfoW(SPI,0,bmp,SPIF)
    if not ok: raise HTTPException(status_code=500, detail=f"Falha SPI (erro {ctypes.get_last_error()})")
    return {"status":"sucesso","mensagem":"Refresh forçado","bmp_path":bmp}

# ============== WEBSITE BLOCKER (hosts) ==============

# Caminho padrão do hosts no Windows
HOSTS_PATH = r"C:\\Windows\\System32\\drivers\\etc\\hosts"
IP_REDIRECT = "127.0.0.1"

def _normalize_websites(websites: _List[str]) -> _List[str]:
    out = []
    for w in websites or []:
        w = (w or "").strip()
        if not w:
            continue
        # remove esquema e barras
        w = w.replace("http://", "").replace("https://", "").strip("/ ")
        # evita linhas com espaços múltiplos
        w = w.split()[0]
        if w and w not in out:
            out.append(w)
    return out

def _ensure_writable(p: str):
    try:
        os.chmod(p, 0o666)
    except Exception:
        pass

def _block_in_hosts(websites: _List[str]) -> int:
    sites = _normalize_websites(websites)
    if not sites:
        return 0
    _ensure_writable(HOSTS_PATH)
    # lê conteúdo existente
    try:
        with open(HOSTS_PATH, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
    except FileNotFoundError:
        content = ""
    added = 0
    with open(HOSTS_PATH, "a", encoding="utf-8", errors="ignore") as f:
        for s in sites:
            entry = f"{IP_REDIRECT} {s}"
            if entry not in content:
                f.write(entry + "\n")
                added += 1
    return added

def _unblock_in_hosts(websites: _List[str]) -> int:
    sites = _normalize_websites(websites)
    if not sites:
        return 0
    _ensure_writable(HOSTS_PATH)
    try:
        with open(HOSTS_PATH, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
    except FileNotFoundError:
        return 0
    kept = []
    removed = 0
    for line in lines:
        if any((s in line) for s in sites):
            removed += 1
            continue
        kept.append(line)
    with open(HOSTS_PATH, "w", encoding="utf-8", errors="ignore") as f:
        f.writelines(kept)
    return removed

def _list_blocked_hosts() -> _List[str]:
    out: _List[str] = []
    try:
        with open(HOSTS_PATH, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                ln = line.strip()
                if not ln or ln.startswith("#"): 
                    continue
                parts = ln.split()
                if len(parts) >= 2 and parts[0] == IP_REDIRECT:
                    host = parts[1].strip()
                    if host and host not in out:
                        out.append(host)
    except FileNotFoundError:
        pass
    return out

@app.post("/block_sites")
async def block_sites_api(request: Request, x_agent_key: Optional[str] = None):
    """Bloqueia uma lista de sites no arquivo hosts.
    Body JSON: { "websites": ["site1.com", "www.site2.com"] }
    """
    require_key(x_agent_key)
    try:
        data = await request.json()
        websites = data.get("websites") or []
        if not isinstance(websites, list):
            raise HTTPException(status_code=400, detail="Campo 'websites' deve ser uma lista de strings")
        n = _block_in_hosts([str(x) for x in websites])
        return {"ok": True, "message": f"{n} entradas adicionadas ao hosts", "count": n}
    except HTTPException:
        raise
    except PermissionError:
        raise HTTPException(status_code=403, detail="Sem permissão para editar o arquivo hosts. Execute o agente como Administrador.")
    except Exception as e:
        logger.exception("Erro em /block_sites")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/unblock_sites")
async def unblock_sites_api(request: Request, x_agent_key: Optional[str] = None):
    """Remove entradas do hosts para os sites informados.
    Body JSON: { "websites": ["site1.com", "www.site2.com"] }
    """
    require_key(x_agent_key)
    try:
        data = await request.json()
        websites = data.get("websites") or []
        if not isinstance(websites, list):
            raise HTTPException(status_code=400, detail="Campo 'websites' deve ser uma lista de strings")
        n = _unblock_in_hosts([str(x) for x in websites])
        return {"ok": True, "message": f"{n} entradas removidas do hosts", "count": n}
    except HTTPException:
        raise
    except PermissionError:
        raise HTTPException(status_code=403, detail="Sem permissão para editar o arquivo hosts. Execute o agente como Administrador.")
    except Exception as e:
        logger.exception("Erro em /unblock_sites")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/blocked_sites")
def blocked_sites_api(x_agent_key: Optional[str] = None):
    """Lista os domínios atualmente bloqueados no arquivo hosts (127.0.0.1 <host>)."""
    require_key(x_agent_key)
    try:
        items = _list_blocked_hosts()
        return {"ok": True, "items": items, "count": len(items)}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro em /blocked_sites")
        raise HTTPException(status_code=500, detail=str(e))

# ============== LIMPEZA PROGRAMADA / STARTUP ==============

def _current_wallpaper_mongo_id() -> Optional[ObjectId]:
    try:
        import winreg
        k = winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Control Panel\\Desktop", 0, winreg.KEY_READ)
        mid = winreg.QueryValueEx(k, "WallpaperMongoID")[0]; k.Close()
        return ObjectId(mid) if mid and ObjectId.is_valid(mid) else None
    except: return None

def clean_old_wallpapers():
    try:
        db = DBI.client[S.DB_NAME]
        files = db[f"{S.WALLPAPER_COLLECTION}.files"]
        cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=S.DAYS_TO_KEEP)

        current_id = _current_wallpaper_mongo_id()

        query = {
            "uploadDate": {"$lt": cutoff},
            "$or": [
                {"metadata.lastUsedAt": {"$exists": False}},
                {"metadata.lastUsedAt": {"$lt": cutoff}}
            ]
        }
        if current_id:
            query["_id"] = {"$ne": current_id}

        cur = files.find(query, {"_id": 1})
        deleted = 0
        for f in cur:
            try:
                DBI.fs.delete(f["_id"]); deleted += 1
            except Exception as e:
                logger.warning(f"Erro ao remover {f['_id']}: {e}")

        if deleted:
            logger.info(f"Limpeza: {deleted} arquivos removidos")
    except Exception as e:
        logger.warning(f"Erro limpeza: {e}")

def _start_background_tasks():
    import threading
    def _loop():
        # primeira execução após alguns segundos; depois a cada 24h
        time.sleep(5)
        while True:
            try: clean_old_wallpapers()
            except: pass
            time.sleep(24*3600)
    threading.Thread(target=_loop, daemon=True).start()

def _register_with_backend():
    import threading, requests
    def _runner():
        while True:
            try:
                sysinfo = system_info(S.PORT)
                dados = {
                    "id_agente": S.ID_AGENTE,
                    "codigo": MACHINE_CODE or get_or_create_machine_code(),
                    "endereco": AGENT_URL or sysinfo.get("agent_url") or f"http://{S.HOST}:{S.PORT}",
                    "tipo": "wallpaper",
                    "device_name": sysinfo.get("device_name"),
                    "ip": sysinfo.get("ip"),
                    "ram_total_gb": sysinfo.get("ram_total_gb"),
                    "storage_total_gb": sysinfo.get("storage_total_gb"),
                    "storage_free_gb": sysinfo.get("storage_free_gb"),
                    "motherboard": sysinfo.get("motherboard"),
                }
                r = requests.post(f"{S.URL_BACKEND}/registrar", json=dados, timeout=10)
                logger.info(f"Registrado no backend: {r.status_code}")
            except Exception as e:
                logger.error(f"Erro ao registrar no backend: {e}")
            time.sleep(60)
    if S.REGISTRAR_COM_BACKEND:
        threading.Thread(target=_runner, daemon=True).start()

@app.on_event("startup")
def startup():
    logger.info("="*60)
    logger.info("Iniciando o agente…")
    logger.info(f"ID: {S.ID_AGENTE} | Backend: {S.URL_BACKEND} | Registrar? {S.REGISTRAR_COM_BACKEND}")
    logger.info(f"Listen: http://{S.HOST}:{S.PORT}")
    # gravar AgentUrl no Registro
    try:
        _write_registry_value("AgentUrl", f"http://{local_ip()}:{S.PORT}")
    except: pass
    # autostart (opcional)
    try:
        import winreg
        run_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
        cmd = f'"{sys.executable}" "{os.path.abspath(__file__)}"'
        k = winreg.CreateKey(winreg.HKEY_CURRENT_USER, run_path)
        winreg.SetValueEx(k, "WallpaperAgent", 0, winreg.REG_SZ, cmd); k.Close()
        logger.info("Auto-start configurado em HKCU\\...\\Run")
    except Exception as e:
        logger.warning(f"Auto-start: {e}")

    _start_background_tasks()
    _register_with_backend()

if __name__ == "__main__":
    try:
        import uvicorn
        # Run the local FastAPI app instance directly to avoid module import issues
        uvicorn.run(app, host=S.HOST, port=S.PORT, log_level="info", reload=False)
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
