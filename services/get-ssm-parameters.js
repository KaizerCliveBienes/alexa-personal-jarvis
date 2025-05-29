import { GetParameterCommand } from "@aws-sdk/client-ssm";

export const getParamOrDefault = async (
  ssmClient,
  ssmParamName,
  envVarName,
  withDecryption = false,
) => {
  let value;

  try {
    const command = new GetParameterCommand({
      Name: `${process.env.PARAMETER_STORE_PREFIX}${ssmParamName}`,
      WithDecryption: withDecryption,
    });
    const response = await ssmClient.send(command);

    if (response.Parameter && response.Parameter.Value) {
      value = response.Parameter.Value;
      console.log(
        `Successfully retrieved ${ssmParamName} from SSM Parameter Store.`,
      );
    } else {
      console.warn(`SSM Parameter ${ssmParamName} found but has no value.`);
    }
  } catch (error) {
    if (error.name === "ParameterNotFound") {
      console.warn(
        `SSM Parameter ${ssmParamName} not found. Falling back to environment variable.`,
      );
    } else {
      console.error(`Error retrieving ${ssmParamName} from SSM:`, error);
    }
  }

  // fallback to env variables
  if (value === undefined && process.env[envVarName]) {
    value = process.env[envVarName];
    console.log(
      `Successfully retrieved ${envVarName} from environment variables.`,
    );
  } else if (value === undefined) {
    console.warn(
      `Neither SSM Parameter ${ssmParamName} nor environment variable ${envVarName} found.`,
    );
  }

  return value;
};
