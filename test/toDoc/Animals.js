/**
 * @class Animals
 */
class Animals {

    /**
     * @lends Animals.prototype
     */

    /**
     * @property {string} name Название животного
     */
    constrictor(name){
        this._name = name;
    }

    /**
     * Возвращает имя животного
     * @return {*}
     */
    getName(){
        return this._name;
    }

    /**
     * Поедание
     * @param {Object} who
     */
    eat(who){
        console.log('Om nom nom ' + who.getName() + ' so good');
    }

    /**
     * Заставляет животное родить другое животное
     * @param {String} name
     * @param {Animals} animal
     * @return {Animals}
     */
    static giveBirthTo(animal,name){
        return new animal(name);
    }
}