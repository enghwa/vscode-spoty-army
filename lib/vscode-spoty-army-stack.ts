import * as cdk from '@aws-cdk/core';
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import logs = require('@aws-cdk/aws-logs');
import autoscaling = require('@aws-cdk/aws-autoscaling');

export class VscodeSpotyArmyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const vpc = new ec2.Vpc(this, "armyspoty", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    })

    const logGroup = new logs.LogGroup(this, "oneNodeEcsLogGroup", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_WEEK
    })

    const asgSpot = new autoscaling.AutoScalingGroup(this, "spotASG", {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MEDIUM), //t4g.micro 2vcpu/1gb, t4g.medium: 2vcpu/4gb
      machineImage: ec2.MachineImage.fromSsmParameter('/aws/service/bottlerocket/aws-ecs-1/arm64/1.1.0/image_id'),
      spotPrice: '0.0130',
      // blockDevices: [{
      //   deviceName: '/dev/xvda',
      //   volume: autoscaling.BlockDeviceVolume.ebs(200)
      // }],
      updatePolicy: autoscaling.UpdatePolicy.rollingUpdate(),
      // keyName: '',
      // userData: ec2.UserData.custom(`
      //     [settings.kernel.sysctl]
      //     "user.max_user_namespaces" = "16384"
      //     "vm.max_map_count" = "262144"
      // `),
      desiredCapacity: 1,
      maxCapacity: 1,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      vpc
    })
    asgSpot.connections.allowFromAnyIpv4(ec2.Port.tcp(80));
    // asgSpot.connections.allowFrom(ec2.Peer.ipv4('XXXXX'), ec2.Port.tcp(80))

    const cluster = new ecs.Cluster(this, 'oneNodeEcsCluster', {
      vpc,
      enableFargateCapacityProviders: true,
      // containerInsights: true, 
    });

    const spotCapacityProvider = new ecs.AsgCapacityProvider(this, 'spotAsgCapacityProvider', {
      autoScalingGroup: asgSpot,
      machineImageType: ecs.MachineImageType.BOTTLEROCKET,
      capacityProviderName: cluster.clusterName,
      spotInstanceDraining: true,
      enableManagedScaling: false, // we stay single
      enableManagedTerminationProtection: false
    })
    cluster.addAsgCapacityProvider(spotCapacityProvider, { machineImageType: ecs.MachineImageType.BOTTLEROCKET })

    const vscodeTaskDef = new ecs.Ec2TaskDefinition(this, 'vscode-taskdef')
    const vscodeContainer = vscodeTaskDef.addContainer('vscode-container', {
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/u3r1l1j7/vscodeserver:latest'), //https://gallery.ecr.aws/u3r1l1j7/code-server
      cpu: 1024,
      memoryLimitMiB: 900,
      logging: new ecs.AwsLogDriver({ logGroup, streamPrefix: 'vscode-' })
    })
    vscodeContainer.addPortMappings({ containerPort: 3000, hostPort: 80 })
    new ecs.Ec2Service(this, 'openvscode', {
      cluster,
      taskDefinition: vscodeTaskDef,
      desiredCount: 1
    })
  }
}
