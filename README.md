# One node ECS 

To run openvscode server on AWS Graviton2.
The underlying node is a Spot EC2 with Bottlerocket!

access remotely via http://<instance IP> - 
lock it down to your client IP address (line 39), so not to expose your vscode to the whole world!


or you can use AWS SSM, since bottlerocket registers itself to AWS Systems Manager Fleet!
(uncomment line 39 since you do not need any port exposed)

```bash
aws ssm start-session --target "Your Instance ID" --document-name AWS-StartPortForwardingSession --parameters "portNumber"=["80"],"localPortNumber"=["8080"]

```
access your vscode at `http://localhost:8080`
(some img error due to port forwarding)

# Todo
- publish Dockerfile
- add devtools/language, right now u have to sudo/apt-get
- CI with codebuild 
- get persistence storage
- health check
