/**
 * Ягуар
 * @class Animals.Jaguar
 */
class Jaguar extends Animals{
    /**
     * @lends Animals.Jaguar.prototype
     */

    /**
     * Мы хищник мы едим только других животных
     * @param who
     */
    eat(who){
        if (who instanceof Animals){
            super;
        } else {
            console.log('blah');
        }
    }

    /**
     * Ягуарчики могут родить только ягуарчиков
     * @param {string} name Имя нового звереныша
     * @return {Animals}
     */
    static giveBirthTo(name){
        return super( Jaguar, name );
    }
}