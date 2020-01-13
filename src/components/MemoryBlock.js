import React from 'react';
import MemoryCell from './MemoryCell.js';

function MemoryBlock(props) {
    return (
        <span className="memory-block-container">
            {props.blockState.cells.map((cell, index) => {
                return <MemoryCell key={index} cellState={cell} />;
            })}
        </span>
    );
}

export default MemoryBlock;
