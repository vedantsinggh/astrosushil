import { logger } from '../utils/logger';

/**
 * Start-up checks for the testing deployment (infrastructure/testing), which runs with
 * NODE_ENV=production on a COPY of real customer data. They only apply when
 * `DEPLOYMENT_ENVIRONMENT=testing`; with it unset (production) nothing is checked and
 * nothing changes.
 *
 *  - error   RAZORPAY_KEY_ID is a live key (`rzp_live_...`): the process refuses to start, so a
 *            testing deployment can never take real money.
 *  - warning MESSAGING_RECIPIENT_ALLOWLIST_ENABLED is not true: SMS, WhatsApp, e-mail and push
 *            may reach the copied customers. Not refused (it may be intentional), but loud.
 */
export interface DeploymentSafetyResult {
  testing: boolean;
  errors: string[];
  warnings: string[];
}

export function isTestingDeployment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DEPLOYMENT_ENVIRONMENT?.trim().toLowerCase() === 'testing';
}

export function checkDeploymentSafety(env: NodeJS.ProcessEnv = process.env): DeploymentSafetyResult {
  const result: DeploymentSafetyResult = { testing: isTestingDeployment(env), errors: [], warnings: [] };
  if (!result.testing) return result;

  if (env.RAZORPAY_KEY_ID?.trim().startsWith('rzp_live_')) {
    result.errors.push(
      'DEPLOYMENT_ENVIRONMENT=testing but RAZORPAY_KEY_ID is a LIVE key (rzp_live_...). Use Razorpay test keys (rzp_test_...) in testing.'
    );
  }
  const allowlist = env.MESSAGING_RECIPIENT_ALLOWLIST_ENABLED?.trim().toLowerCase();
  if (allowlist !== 'true' && allowlist !== '1') {
    result.warnings.push(
      'DEPLOYMENT_ENVIRONMENT=testing but MESSAGING_RECIPIENT_ALLOWLIST_ENABLED is not true: SMS, WhatsApp, e-mail and push can reach the real customers in the copied database.'
    );
  }
  return result;
}

/**
 * Runs the checks and logs them. Throws when a check fails, so the caller's start-up stops
 * before the process listens or claims work.
 */
export function enforceDeploymentSafety(processName: string, env: NodeJS.ProcessEnv = process.env): void {
  const result = checkDeploymentSafety(env);
  if (!result.testing) return;
  for (const warning of result.warnings) logger.warn({ processName }, `[DeploymentSafety] WARNING: ${warning}`);
  if (result.errors.length) {
    for (const error of result.errors) logger.fatal({ processName }, `[DeploymentSafety] ${error}`);
    throw new Error(`Deployment safety check failed: ${result.errors.join(' ')}`);
  }
  logger.info({ processName }, '[DeploymentSafety] Testing deployment checks passed');
}
