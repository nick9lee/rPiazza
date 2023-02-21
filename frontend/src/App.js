import { useState } from 'react';
import './App.css';

function App() {
  // Define the list of available colors
  const colors = [
    '#FFFFFF',
    '#E4E4E4',
    '#888888',
    '#222222',
    '#FFA7D1',
    '#E50000',
    '#E59500',
    '#A06A42',
    '#E5D900',
    '#94E044',
    '#02BE01',
    '#00D3DD',
    '#0083C7',
    '#0000EA',
    '#CF6EE4',
    '#820080',
  ];

  // Define the state for the selected color and the pixel colors
  const [selectedColor, setSelectedColor] = useState(colors[0]);
  const [pixels, setPixels] = useState(Array(40000).fill('#eee'));

  // Define the event handlers for selecting a color and changing a pixel
  const handleColorClick = (color) => {
    setSelectedColor(color);
  };

  const handlePixelClick = (index) => {
    const newPixels = [...pixels];
    newPixels[index] = selectedColor;
    setPixels(newPixels);
  };

  // Generate the cells for the color picker section
  const colorCells = colors.map((color, index) => {
    const cellStyle = {
      backgroundColor: color,
      border: `1px solid ${color === selectedColor ? 'black' : '#ccc'}`,
    };

    return (
      <div
        key={index}
        className="cell"
        style={cellStyle}
        onClick={() => handleColorClick(color)}
      ></div>
    );
  });

  // Generate the cells for the grid section
  const gridCells = pixels.map((color, index) => (
    <div
      key={index}
      className="cell"
      style={{ backgroundColor: color }}
      onClick={() => handlePixelClick(index)}
    ></div>
  ));

  return (
    <div>
      <div className="App">
        {gridCells}
      </div>
      <div className="ColorPicker">
        {colorCells}
      </div>
    </div>
  );
}

export default App;


  // #FFFFFF (white)
  // #E4E4E4 (light gray)
  // #888888 (gray)
  // #222222 (dark gray)
  // #FFA7D1 (pink)
  // #E50000 (red)
  // #E59500 (orange)
  // #A06A42 (brown)
  // #E5D900 (yellow)
  // #94E044 (lime green)
  // #02BE01 (green)
  // #00D3DD (cyan)
  // #0083C7 (blue)
  // #0000EA (dark blue)
  // #CF6EE4 (purple)
  // #820080 (violet)
