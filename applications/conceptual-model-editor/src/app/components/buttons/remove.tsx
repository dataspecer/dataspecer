export const RemoveButton = (props: { onClickHandler?: () => void }) => {
    const { onClickHandler } = props;
    return (
        <button className="ml-0.5 hover:bg-teal-400" title="remove entity" onClick={onClickHandler}>
            🗑
        </button>
    );
};
