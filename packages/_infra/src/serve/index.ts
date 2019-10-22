import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import elbv2 = require('@aws-cdk/aws-elasticloadbalancingv2');
import targets = require('@aws-cdk/aws-elasticloadbalancingv2-targets');
import cert = require('@aws-cdk/aws-certificatemanager');

import { LambdaXyz } from './lambda.xyz';
import { ApplicationProtocol, SslPolicy } from '@aws-cdk/aws-elasticloadbalancingv2';

/**
 * Tile serving infrastructure
 */
export class ServeStack extends cdk.Stack {
    public constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const lambda = new LambdaXyz(this, 'LambdaXyz');

        // TODO if/when the default VPC is set to default we can switch this to 'isDefault: true'
        // eslint-disable-next-line @typescript-eslint/camelcase
        const vpc = ec2.Vpc.fromLookup(this, 'AlbVpc', { tags: { AWS_Solutions: 'LandingZoneStackSet' } });
        const lb = new elbv2.ApplicationLoadBalancer(this, 'LB', { vpc, internetFacing: false });

        // Due to the convoluted way of getting SSL certificates, we have a provisioned certificate
        // in our account we need to look it up
        const certArn = process.env.ALB_CERTIFICATE_ARN;
        if (certArn == null) {
            throw new Error('Unable to load certificate ARN: $ALB_CERTIFICATE_ARN');
        }

        const sslCert = cert.Certificate.fromCertificateArn(this, 'AlbCert', certArn);

        const targetLambda = new targets.LambdaTarget(lambda.lambda);
        const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
            targets: [targetLambda],
        });
        lb.addListener('HttpListener', {
            port: 80,
            protocol: ApplicationProtocol.HTTP,
            defaultTargetGroups: [targetGroup],
        });
        lb.addListener('HttpsListener', {
            port: 443,
            protocol: ApplicationProtocol.HTTPS,
            sslPolicy: SslPolicy.RECOMMENDED,
            certificateArns: [sslCert.certificateArn],
            defaultTargetGroups: [targetGroup],
        });

        new cdk.CfnOutput(this, 'LambdaXyzAlb', { value: lb.loadBalancerDnsName });
    }
}
