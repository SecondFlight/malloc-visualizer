import React from 'react';

function MemoryCell(props) {
    return (
        <div className={"cell-container"
                                + (props.cellState.isAllocated ? ' allocated' : ' unallocated')
                                + (props.cellState.isReserved ? ' reserved' : ' unreserved')}>
        </div>
    );
}

export default MemoryCell;