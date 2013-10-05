/**
 * Зебра
 * @class Animals.Zebra
 */
class Zebra extends Animals{
    /**
     * @lends Animals.Zebra.prototype
     */

    /**
     * Пытаемся съесть кого-то, мы едим только травку
     * @param who
     */
    eat(who){
        if (who instanceof Grass){
            super;
        } else {
            console.log('blah');
        }
    }

    /**
     * Зебры могут родить только зебр
     * @param {string} name Имя нового звереныша
     * @return {Animals}
     */
    static giveBirthTo(name){
        return super( Jaguar, name );
    }
}