import { DeliveryType } from './ScoringEnums';

export class FreeHitStateMachine {
    /**
     * 7. FREE HIT STATE MACHINE
     * Evaluates the next state of isFreeHit based on the previous state and the current delivery.
     */
    static getNextFreeHitState(currentIsFreeHit, currentDelivery) {
        if (currentDelivery === DeliveryType.NO_BALL) {
            // No Ball always triggers a Free Hit on the NEXT ball.
            return true;
        }

        if (currentIsFreeHit) {
            // We are currently on a free hit ball.
            if (currentDelivery === DeliveryType.WIDE || currentDelivery === DeliveryType.NO_BALL) {
                // Free Hit continues if the ball was illegal.
                return true;
            }

            // Free hit ends if normal, bye, or leg bye
            if (currentDelivery === DeliveryType.NORMAL ||
                currentDelivery === DeliveryType.BYE ||
                currentDelivery === DeliveryType.LEG_BYE) {
                return false;
            }
        }

        return false;
    }
}
