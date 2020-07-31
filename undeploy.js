const AWS = require("aws-sdk");
AWS.config.logger = console;

const fs = require("fs");
const childProcess = require("child_process");

const region = "us-west-2";
const apiVersion = "latest";

const iam = new AWS.IAM();
const lambda = new AWS.Lambda({ apiVersion, region });

const roleName = 'lambda_basic_execution';
const policyArns = [
  "arn:aws:iam::aws:policy/service-role/AWSLambdaRole",
  "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
];

const basename = (filename) => filename.replace(".js", "");

const lambdaNames = fs.readdirSync("lambdas").map(basename);

const deleteLambdas = (names) => {
  const deleteLambdaPromises = names.map((name) => {
    return lambda
      .deleteFunction({
        FunctionName: name,
      })
      .promise();
  });

  return Promise.all(deleteLambdaPromises);
};

const detachPolicies = (policyArns, roleName) => {
  const detachPolicyPromises = policyArns.map((arn) => {
    return iam.detachRolePolicy({ PolicyArn: arn, RoleName: roleName }).promise();
  });

  return Promise.all(detachPolicyPromises)
};

const deleteRole = (name) => {
  return iam.deleteRole({ RoleName: name }).promise();
}

deleteLambdas(lambdaNames)
  .catch(() = {})
  .then(() => detachPolicies(policyArns, roleName))
  .then(() => deleteRole(roleName));
