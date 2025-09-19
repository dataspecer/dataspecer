
export interface Position {

    x: number;

    y: number;

    /**
     * Used by layout algorithm to express desire of user
     * to not move the element.
     */
    anchored: true | null;

};
