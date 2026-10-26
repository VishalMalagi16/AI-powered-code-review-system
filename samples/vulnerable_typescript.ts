interface RequestPayload {
  command: string;
  token: string;
}

export function executeDynamicTask(payload: RequestPayload): any {
  // Dangerous new Function dynamic execution
  const dynamicFn = new Function("data", payload.command);
  
  // Loose equality
  if (payload.token == null) {
    return null;
  }

  // Console output in production code
  console.log("Executing dynamic task for token:", payload.token);

  return dynamicFn(payload);
}
