#!/bin/bash
# User Data da instância EC2 "Jenkins Lab" (Aula 7), adaptado para Node.js no lugar do Maven.
# Roda uma única vez, como root, no primeiro boot da instância.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# Registra a execução para consulta na instância
exec > >(tee -a /var/log/jenkins-bootstrap.log) 2>&1

# Dependências, Java (exigido pelo Jenkins) e Git
apt-get update
apt-get install -y ca-certificates curl gnupg fontconfig openjdk-21-jre git

# Node.js 22 (roda os testes do projeto)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# Repositório oficial Jenkins LTS
install -d -m 0755 /etc/apt/keyrings
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key \
  -o /etc/apt/keyrings/jenkins-keyring.asc
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" \
  > /etc/apt/sources.list.d/jenkins.list

# Instala e inicia o Jenkins
apt-get update
apt-get install -y jenkins
systemctl enable --now jenkins
