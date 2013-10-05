/**
 * Травка
 * @class Grass
 */
class Grass {
    /**
     * @lends Grass.prototype
     */

    /**
     * Создаем травку
     * @param {string} name
     */
    construct(name){
        this._name = name;
    }

    /**
     * Возвращает название травки
     * @return {string}
     */
    getName(){
        return this._name;
    }

}