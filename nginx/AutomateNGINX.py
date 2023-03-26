import subprocess
from time import sleep

subprocess.run("sudo systemctl start nginx", shell=True)
subprocess.run("sudo systemctl start keepalived", shell=True)

def restart_services():
    try:
        sleep(1)
        print("Restarting Keepalived & NGINX")
        subprocess.run("sudo systemctl start nginx", shell=True)
        subprocess.run("sudo systemctl start keepalived", shell=True)
        print("Restarted")
        sleep(1)
    except Exception as e:
        print(e) 

while(1):
    try:
        NGINX_State = subprocess.check_output("sudo systemctl is-active nginx", shell=True).decode("utf-8").strip()
        KA_State = subprocess.check_output("sudo systemctl is-active keepalived", shell=True).decode("utf-8").strip()
    except:
        print("Error occured in checking active status")
        restart_services()
    else:
        if KA_State == "inactive" or NGINX_State == "inactive":
            print("A service is inactive")
            restart_services()
            

