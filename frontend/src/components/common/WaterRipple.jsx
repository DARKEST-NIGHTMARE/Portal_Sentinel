import React, { useEffect, useRef } from 'react';

const WaterRipple = () => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', { alpha: true });
    let width, height;
    let size, buffer1, buffer2, tempBuffer;
    
    const damping = 0.98;
    const ripplePower = 250;
    
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      
      size = Math.floor(width / 4) * Math.floor(height / 4);
      buffer1 = new Float32Array(size).fill(0);
      buffer2 = new Float32Array(size).fill(0);
    };


    const createRipple = (x, y, power = ripplePower) => {
      const w4 = Math.floor(width / 4);
      const h4 = Math.floor(height / 4);
      const rx = Math.floor((x / width) * w4);
      const ry = Math.floor((y / height) * h4);
      
      for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
          const nx = rx + i;
          const ny = ry + j;
          if (nx >= 0 && nx < w4 && ny >= 0 && ny < h4) {
            buffer1[ny * w4 + nx] = power;
          }
        }
      }
    };

    const update = () => {
      const w4 = Math.floor(width / 4);
      
      for (let i = w4; i < size - w4; i++) {
        buffer2[i] = (
          (buffer1[i - 1] + 
           buffer1[i + 1] + 
           buffer1[i - w4] + 
           buffer1[i + w4]) / 2 - buffer2[i]
        ) * damping;
      }
      
      // Swap buffers
      tempBuffer = buffer1;
      buffer1 = buffer2;
      buffer2 = tempBuffer;
    };

    const draw = () => {
      const w4 = Math.floor(width / 4);
      const h4 = Math.floor(height / 4);
      const imageData = ctx.createImageData(w4, h4);
      const data = imageData.data;
      
      for (let i = 0; i < size; i++) {
        const val = buffer1[i];
        const offset = i * 4;
        
        // Use a blueish tint for the ripples
        data[offset] = 0;     // R
        data[offset + 1] = 191; // G
        data[offset + 2] = 255; // B
        data[offset + 3] = Math.min(255, Math.abs(val) * 2); // A (Transparency based on wave height)
      }
      
      ctx.clearRect(0, 0, width, height);
      
      // Render the low-res data scaled up
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = w4;
      tempCanvas.height = h4;
      tempCanvas.getContext('2d').putImageData(imageData, 0, 0);
      
      ctx.globalAlpha = 0.3; // Subtle overlay
      ctx.drawImage(tempCanvas, 0, 0, width, height);
    };

    const animate = () => {
      update();
      draw();
      requestAnimationFrame(animate);
    };

    // Auto-drip system
    const dripInterval = setInterval(() => {
      const x = Math.random() * width;
      const y = Math.random() * height;
      createRipple(x, y, 50 + Math.random() * 50);
    }, 2000);

    const handleMouseMove = (e) => {
      createRipple(e.clientX, e.clientY, 30);
    };

    const handleClick = (e) => {
      createRipple(e.clientX, e.clientY, 1000);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      clearInterval(dripInterval);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none', // Allows clicking through to UI but we catch events via window
        zIndex: 0,
        opacity: 0.6
      }}
    />
  );
};

export default WaterRipple;
