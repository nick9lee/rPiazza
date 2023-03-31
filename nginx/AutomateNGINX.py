import subprocess
from time import sleep

"""
A simple implementation of Proxy Automation that runs when ever the EC2 instance is started.
Will look at Keepalive and NGINX status and will restart if one is inactive or error is seen. 
"""

subprocess.run("sudo systemctl start nginx", shell=True) # Start nginx
subprocess.run("sudo systemctl start keepalived", shell=True) # Start keepalived

def restart_services():
    """
    Function that restarts the service and returns any errors seen.
    """
    try:
        print("Restarting Keepalived & NGINX")
        subprocess.run("sudo systemctl start nginx", shell=True) # restart nginx
        subprocess.run("sudo systemctl start keepalived", shell=True) # restart keepalived
        print("Restarted")
    except Exception as e:
        print(e) 

while(1): # Constantly check
    try: # Check for active status is NGINX and Keepalived
        NGINX_State = subprocess.check_output("sudo systemctl is-active nginx", shell=True).decode("utf-8").strip()
        KA_State = subprocess.check_output("sudo systemctl is-active keepalived", shell=True).decode("utf-8").strip()
    except: # If error, then restart services
        print("Error occured in checking active status")
        restart_services()
    else: # If inactive, then restart services
        if KA_State == "inactive" or NGINX_State == "inactive":
            print("A service is inactive")
            restart_services()
            

