import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { STATUS, getTransition } from '../utils/requestStateMachine.js';

describe('Request State Machine Unit Tests', () => {
  describe('Valid Transitions', () => {
    it('allows provider to accept a PENDING request -> ACCEPTED', () => {
      const res = getTransition(STATUS.PENDING, 'accept', 'provider');
      assert.deepEqual(res, { to: STATUS.ACCEPTED });
    });

    it('allows provider to decline a PENDING request -> DECLINED', () => {
      const res = getTransition(STATUS.PENDING, 'decline', 'provider');
      assert.deepEqual(res, { to: STATUS.DECLINED });
    });

    it('allows customer to cancel a PENDING request -> CANCELLED', () => {
      const res = getTransition(STATUS.PENDING, 'cancel', 'customer');
      assert.deepEqual(res, { to: STATUS.CANCELLED });
    });

    it('allows system to expire a PENDING request -> EXPIRED', () => {
      const res = getTransition(STATUS.PENDING, 'expire', 'system');
      assert.deepEqual(res, { to: STATUS.EXPIRED });
    });

    it('allows provider to complete an ACCEPTED request -> COMPLETED', () => {
      const res = getTransition(STATUS.ACCEPTED, 'complete', 'provider');
      assert.deepEqual(res, { to: STATUS.COMPLETED });
    });

    it('allows customer to cancel an ACCEPTED request -> CANCELLED', () => {
      const res = getTransition(STATUS.ACCEPTED, 'cancel', 'customer');
      assert.deepEqual(res, { to: STATUS.CANCELLED });
    });

    it('allows provider to cancel an ACCEPTED request -> CANCELLED', () => {
      const res = getTransition(STATUS.ACCEPTED, 'cancel', 'provider');
      assert.deepEqual(res, { to: STATUS.CANCELLED });
    });
  });

  describe('Invalid Transitions from Terminal States', () => {
    const terminalStates = [
      STATUS.DECLINED,
      STATUS.COMPLETED,
      STATUS.CANCELLED,
      STATUS.EXPIRED,
    ];

    const actions = ['accept', 'decline', 'cancel', 'complete', 'expire'];

    for (const state of terminalStates) {
      for (const action of actions) {
        it(`rejects action "${action}" when request is in terminal state "${state}"`, () => {
          assert.throws(
            () => getTransition(state, action, 'provider'),
            (err) => {
              assert.equal(err.statusCode, 400);
              assert.match(err.message, new RegExp(`Cannot ${action} a request that is already ${state}`));
              return true;
            }
          );
        });
      }
    }
  });

  describe('Wrong Actor Roles', () => {
    it('prevents customer from accepting a PENDING request (provider only)', () => {
      assert.throws(
        () => getTransition(STATUS.PENDING, 'accept', 'customer'),
        (err) => {
          assert.equal(err.statusCode, 403);
          assert.match(err.message, /Only the provider can accept/);
          return true;
        }
      );
    });

    it('prevents provider from cancelling a PENDING request (customer only)', () => {
      assert.throws(
        () => getTransition(STATUS.PENDING, 'cancel', 'provider'),
        (err) => {
          assert.equal(err.statusCode, 403);
          assert.match(err.message, /Only the customer can cancel/);
          return true;
        }
      );
    });

    it('prevents customer from marking an ACCEPTED request complete (provider only)', () => {
      assert.throws(
        () => getTransition(STATUS.ACCEPTED, 'complete', 'customer'),
        (err) => {
          assert.equal(err.statusCode, 403);
          assert.match(err.message, /Only the provider can complete/);
          return true;
        }
      );
    });

    it('prevents third-party or unknown role from taking actions', () => {
      assert.throws(
        () => getTransition(STATUS.PENDING, 'accept', 'guest'),
        (err) => {
          assert.equal(err.statusCode, 403);
          return true;
        }
      );
    });
  });

  describe('Unknown Actions and Invalid States', () => {
    it('throws 400 for unknown action on PENDING request', () => {
      assert.throws(
        () => getTransition(STATUS.PENDING, 'refund', 'provider'),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Cannot refund a request that is PENDING/);
          return true;
        }
      );
    });

    it('throws 400 when attempting to complete a PENDING request directly', () => {
      assert.throws(
        () => getTransition(STATUS.PENDING, 'complete', 'provider'),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Cannot complete a request that is PENDING/);
          return true;
        }
      );
    });

    it('throws 400 for completely invalid or null status', () => {
      assert.throws(
        () => getTransition('UNKNOWN_STATE', 'accept', 'provider'),
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Invalid request status/);
          return true;
        }
      );
    });
  });
});
