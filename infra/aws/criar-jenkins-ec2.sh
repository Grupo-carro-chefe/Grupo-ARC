#!/bin/bash
# Cria a instância EC2 com o Jenkins no AWS Academy Learner Lab.
# Rodar no terminal do Learner Lab (AWS CLI já autenticada), com o lab ligado (bolinha verde):
#   bash criar-jenkins-ec2.sh
# Equivale aos slides 12 e 13 da Aula 7: Ubuntu 24.04, t3.small, chave vockey,
# Security Group com a porta 8080 (Jenkins) e 22 (SSH) liberadas.
set -euo pipefail
cd "$(dirname "$0")"

AMI=$(aws ec2 describe-images --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" "Name=state,Values=available" \
  --query 'sort_by(Images,&CreationDate)[-1].ImageId' --output text)
echo "AMI: $AMI"

SG=$(aws ec2 create-security-group --group-name "Jenkins Lab Security Group" \
  --description "Security Group Jenkins Lab" --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id "$SG" --protocol tcp --port 8080 --cidr 0.0.0.0/0 >/dev/null
aws ec2 authorize-security-group-ingress --group-id "$SG" --protocol tcp --port 22 --cidr 0.0.0.0/0 >/dev/null
echo "Security Group: $SG (portas 8080 e 22 liberadas)"

ID=$(aws ec2 run-instances --image-id "$AMI" --instance-type t3.small --key-name vockey \
  --security-group-ids "$SG" --user-data file://jenkins-user-data.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=Jenkins Lab}]' \
  --query 'Instances[0].InstanceId' --output text)
echo "Instância: $ID"

aws ec2 wait instance-running --instance-ids "$ID"
IP=$(aws ec2 describe-instances --instance-ids "$ID" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
echo "IP público: $IP"
echo "Jenkins (após 3 a 5 minutos de instalação): http://$IP:8080"
echo "Senha inicial:"
echo "  ssh -i ~/.ssh/labsuser.pem -o StrictHostKeyChecking=no ubuntu@$IP 'sudo cat /var/lib/jenkins/secrets/initialAdminPassword'"
