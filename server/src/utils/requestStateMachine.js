import ApiError from './ApiError.js';

export const STATUS = Object.freeze({
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
});

export const TRANSITIONS = Object.freeze({
  [STATUS.PENDING]: {
    accept: { to: STATUS.ACCEPTED, actor: 'provider' },
    decline: { to: STATUS.DECLINED, actor: 'provider' },
    cancel: { to: STATUS.CANCELLED, actor: 'customer' },
    expire: { to: STATUS.EXPIRED, actor: 'system' },
  },
  [STATUS.ACCEPTED]: {
    complete: { to: STATUS.COMPLETED, actor: 'provider' },
    cancel: { to: STATUS.CANCELLED, actor: ['customer', 'provider'] },
  },
  [STATUS.DECLINED]: {},
  [STATUS.COMPLETED]: {},
  [STATUS.CANCELLED]: {},
  [STATUS.EXPIRED]: {},
});

const TERMINAL_STATES = new Set([
  STATUS.DECLINED,
  STATUS.COMPLETED,
  STATUS.CANCELLED,
  STATUS.EXPIRED,
]);

/**
 * Validates and retrieves the target status for a state transition.
 * @param {string} currentStatus - Current request status
 * @param {string} action - Action being attempted ('accept', 'decline', 'cancel', 'complete', 'expire')
 * @param {string} actorRole - Role of the requesting actor ('customer', 'provider', 'system')
 * @returns {{ to: string }} Next status
 * @throws {ApiError} 400 for invalid action / terminal state, 403 for unauthorized role
 */
export function getTransition(currentStatus, action, actorRole) {
  if (!currentStatus || !STATUS[currentStatus]) {
    throw new ApiError(400, `Invalid request status: ${currentStatus}`);
  }

  if (TERMINAL_STATES.has(currentStatus)) {
    throw new ApiError(400, `Cannot ${action} a request that is already ${currentStatus}`);
  }

  const allowedTransitions = TRANSITIONS[currentStatus] || {};
  const transition = allowedTransitions[action];

  if (!transition) {
    throw new ApiError(400, `Cannot ${action} a request that is ${currentStatus}`);
  }

  // Validate actor role
  const allowedActors = Array.isArray(transition.actor) ? transition.actor : [transition.actor];
  if (!allowedActors.includes(actorRole)) {
    if (transition.actor === 'provider') {
      throw new ApiError(403, `Only the provider can ${action}`);
    }
    if (transition.actor === 'customer') {
      throw new ApiError(403, `Only the customer can ${action}`);
    }
    throw new ApiError(403, `Unauthorized actor role for action ${action}`);
  }

  return { to: transition.to };
}

export default {
  STATUS,
  TRANSITIONS,
  getTransition,
};
