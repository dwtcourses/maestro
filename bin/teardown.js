#!/usr/bin/env node

const fs = require("fs");
const childProcess = require("child_process");

const retryAsync = require("../src/util/retryAsync");
const { lambdaRoleName, statesRoleName } = require("../src/config/roleNames");
const { lambdaPolicyArns, statesPolicyArns } = require("../src/config/policy-arn");
const { iam, lambda, stepFunctions } = require("../src/aws/services");
const getStateMachineArn = require("../src/aws/getStateMachineArn");
const basename = require("../src/util/basename");


// extract
const lambdaNames = fs.readdirSync("lambdas").map(basename);
const stateMachineName = process.argv[2];

if (!stateMachineName) {
  throw new Error("State machine name needs to be provided");
}

// extract
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

// extract
const deleteStateMachine = (arn) => {
  return stepFunctions.deleteStateMachine({ stateMachineArn: arn }).promise();
};

// extract
const detachPolicies = (policyArns, roleName) => {
  const detachPolicyPromises = policyArns.map((arn) => {
    return iam
      .detachRolePolicy({ PolicyArn: arn, RoleName: roleName })
      .promise();
  });

  return Promise.all(detachPolicyPromises);
};

// extract
const deleteRole = (name) => {
  return iam.deleteRole({ RoleName: name }).promise();
};

deleteLambdas(lambdaNames)
  .catch(console.log)
  .then(() => detachPolicies(lambdaPolicyArns, lambdaRoleName))
  .then(() => retryAsync(() => deleteRole(lambdaRoleName), 5, 7000, .6))

getStateMachineArn(stateMachineName)
  .catch(console.log)
  .then(deleteStateMachine)
  .then(() => detachPolicies(statesPolicyArns, statesRoleName))
  .then(() => retryAsync(() => deleteRole(statesRoleName), 5, 7000, .6))
