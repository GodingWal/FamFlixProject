import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🔒 RDS Security Group Configuration Check');
console.log('==========================================');

async function checkRDSConfiguration() {
  try {
    console.log('\n📋 Step 1: Check RDS Instance');
    const { stdout: rdsOutput } = await execAsync('aws rds describe-db-instances --query "DBInstances[*].[DBInstanceIdentifier,DBInstanceStatus,VpcSecurityGroups[0].VpcSecurityGroupId,Endpoint.Address,Endpoint.Port]" --output table');
    console.log('RDS Instances:');
    console.log(rdsOutput);

    console.log('\n📋 Step 2: Check EC2 Instance');
    const { stdout: ec2Output } = await execAsync('aws ec2 describe-instances --filters "Name=ip-address,Values=18.116.239.92" --query "Reservations[*].Instances[*].[InstanceId,SecurityGroups[0].GroupId,State.Name]" --output table');
    console.log('EC2 Instance:');
    console.log(ec2Output);

    console.log('\n📋 Step 3: Check RDS Security Group Rules');
    const { stdout: sgOutput } = await execAsync('aws ec2 describe-security-groups --group-ids sg-0f80cb884b4158bed --query "SecurityGroups[0].IpPermissions[?FromPort==`5432`]" --output table');
    console.log('RDS Security Group Rules (Port 5432):');
    console.log(sgOutput);

    console.log('\n📋 Step 4: Check if EC2 can reach RDS');
    const { stdout: pingOutput } = await execAsync('ping -c 3 database-1.c9oguyo08qck.us-east-2.rds.amazonaws.com');
    console.log('Ping test to RDS endpoint:');
    console.log(pingOutput);

    console.log('\n📋 Step 5: Test direct connection to RDS port');
    try {
      const { stdout: telnetOutput } = await execAsync('timeout 5 telnet database-1.c9oguyo08qck.us-east-2.rds.amazonaws.com 5432');
      console.log('Telnet test to RDS port 5432:');
      console.log(telnetOutput);
    } catch (error) {
      console.log('Telnet test failed (expected if no direct access):', error.message);
    }

    console.log('\n💡 Recommendations:');
    console.log('1. Ensure RDS instance is in "available" status');
    console.log('2. Verify security group sg-0f80cb884b4158bed allows inbound traffic from sg-04c9b7ce74e980c42 on port 5432');
    console.log('3. Check if both instances are in the same VPC');
    console.log('4. Verify the database endpoint is correct');

  } catch (error) {
    console.error('❌ Error checking RDS configuration:', error.message);
  }
}

checkRDSConfiguration(); 