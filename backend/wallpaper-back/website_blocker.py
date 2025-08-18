import os
import sys
import ctypes
from tkinter import *
import stat

# ---------- Função para garantir privilégios de administrador ----------
def ensure_admin():
    if os.name != "nt":
        return
    try:
        is_admin = ctypes.windll.shell32.IsUserAnAdmin()
    except:
        is_admin = False

    if not is_admin:
        # Eleva o script com UAC
        script = os.path.abspath(sys.argv[0])
        params = f'"{script}"'
        ret = ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, params, None, 1)
        if ret <= 32:
            ctypes.windll.user32.MessageBoxW(
                None,
                "Não foi possível solicitar elevação.\nAbra o PowerShell como Administrador e execute o script.",
                "Permissão necessária",
                0x10
            )
        sys.exit(0)

ensure_admin()

# ---------- Caminho do hosts ----------
HOSTS_PATH = r"C:\Windows\System32\drivers\etc\hosts"
IP_ADDRESS = "127.0.0.1"

# ---------- Janela Tkinter ----------
window = Tk()
window.title("Website Blocker")
window.geometry("650x400")
window.resizable(False, False)

Label(window, text="Website Blocker", font=("Arial", 16, "bold")).pack(pady=10)
Label(window, text="Digite os sites (um por linha):", font=("Arial", 12)).place(x=10, y=50)

site_input = Text(window, height=10, width=50, font=("Arial", 12))
site_input.place(x=10, y=80)

status_label = Label(window, text="", font=("Arial", 12))
status_label.place(x=10, y=300)

# ---------- Funções de bloquear e desbloquear ----------
def block_sites():
    websites = [w.strip() for w in site_input.get(1.0, END).splitlines() if w.strip()]
    try:
        os.chmod(HOSTS_PATH, stat.S_IWRITE)
    except:
        pass

    with open(HOSTS_PATH, "r+", encoding="utf-8") as file:
        content = file.read()
        for web in websites:
            entry = f"{IP_ADDRESS} {web}"
            if entry in content:
                continue
            file.write(entry + "\n")
    status_label.config(text="Sites bloqueados com sucesso!")

def unblock_sites():
    websites = [w.strip() for w in site_input.get(1.0, END).splitlines() if w.strip()]
    try:
        os.chmod(HOSTS_PATH, stat.S_IWRITE)
    except:
        pass

    with open(HOSTS_PATH, "r", encoding="utf-8") as file:
        lines = file.readlines()

    with open(HOSTS_PATH, "w", encoding="utf-8") as file:
        for line in lines:
            if not any(web in line for web in websites):
                file.write(line)

    status_label.config(text="Sites desbloqueados com sucesso!")

# ---------- Botões ----------
Button(window, text="Bloquear", font=("Arial", 12), width=10, command=block_sites, bg="royal blue1", fg="white").place(x=150, y=250)
Button(window, text="Desbloquear", font=("Arial", 12), width=10, command=unblock_sites, bg="green", fg="white").place(x=300, y=250)

window.mainloop()
