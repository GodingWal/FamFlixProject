import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🌐 VPC Configuration and Network Connectivity Check');
console.log('==================================================');

async function checkVPCConfiguration() {
  try {
    console.log('\n📋 Step 1: Get EC2 Instance Details');
    const { stdout: ec2Details } = await execAsync('aws ec2 describe-instances --filters "Name=ip-address,Values=18.116.239.92" --query "Reservations[0].Instances[0].[VpcId,SubnetId,PrivateIpAddress]" --output table');
    console.log('EC2 Instance Details:');
    console.log(ec2Details);

    console.log('\n📋 Step 2: Get RDS Instance Details');
    const { stdout: rdsDetails } = await execAsync('aws rds describe-db-instances --db-instance-identifier database-1 --query "DBInstances[0].[DBSubnetGroup.VpcId,AvailabilityZone]" --output table');
    console.log('RDS Instance Details:');
    console.log(rdsDetails);

    console.log('\n📋 Step 3: Check if EC2 and RDS are in the same VPC');
    const { stdout: vpcCheck } = await execAsync('aws ec2 describe-instances --filters "Name=ip-address,Values=18.116.239.92" --query "Reservations[0].Instances[0].VpcId" --output text');
    const { stdout: rdsVpcCheck } = await execAsync('aws rds describe-db-instances --db-instance-identifier database-1 --query "DBInstances[0].DBSubnetGroup.VpcId" --output text');
    
    console.log('EC2 VPC ID:', vpcCheck.trim());
    console.log('RDS VPC ID:', rdsVpcCheck.trim());
    
    if (vpcCheck.trim() === rdsVpcCheck.trim()) {
      console.log('✅ EC2 and RDS are in the same VPC');
    } else {
      console.log('❌ EC2 and RDS are in different VPCs - this is the problem!');
    }

    console.log('\n📋 Step 4: Check Route Tables');
    const { stdout: routeTables } = await execAsync('aws ec2 describe-route-tables --filters "Name=vpc-id,Values=' + vpcCheck.trim() + '" --query "RouteTables[*].[RouteTableId,Routes[?GatewayId!=null].GatewayId]" --output table');
    console.log('Route Tables:');
    console.log(routeTables);

    console.log('\n📋 Step 5: Check Network ACLs');
    const { stdout: networkAcls } = await execAsync('aws ec2 describe-network-acls --filters "Name=vpc-id,Values=' + vpcCheck.trim() + '" --query "NetworkAcls[*].[NetworkAclId,Entries[?PortRange.From==5432]]" --output table');
    console.log('Network ACLs (Port 5432):');
    console.log(networkAcls);

    console.log('\n📋 Step 6: Test DNS Resolution');
    try {
      const { stdout: nslookup } = await execAsync('nslookup database-1.c9oguyo08qck.us-east-2.rds.amazonaws.com');
      console.log('DNS Resolution for RDS endpoint:');
      console.log(nslookup);
    } catch (error) {
      console.log('DNS resolution failed:', error.message);
    }

    console.log('\n💡 Recommendations:');
    console.log('1. Ensure EC2 and RDS are in the same VPC');
    console.log('2. Check if there are any Network ACLs blocking port 5432');
    console.log('3. Verify route tables allow traffic between subnets');
    console.log('4. Check if RDS is publicly accessible (if needed)');

  } catch (error) {
    console.error('❌ Error checking VPC configuration:', error.message);
  }
}

checkVPCConfiguration(); 