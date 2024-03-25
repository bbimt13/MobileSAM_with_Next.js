'use client'

import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

export default function Counter() {
  const [annotations, setAnnotations] = useState([]);
  const [points, setPoints] = useState([]);
  const [currentAnnotation, setCurrentAnnotation] = useState('');
  const [mode, setMode] = useState('none'); // 'draw-box', 'draw-point', 'none' 중 하나
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [endPoint, setEndPoint] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const canvasRef = useRef(null);

  const handleClearAnnotations = () => {
    setAnnotations([]); // annotations 배열 비우기
    setPoints([])
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (imageUrl) {
      const image = new Image();
      image.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        points.forEach(point => {
          context.beginPath();
          context.arc(point.x, point.y, 2, 0, 2 * Math.PI);
          context.fillStyle = 'red';
          context.fill();
        });
        annotations.forEach(annotation => {
          context.beginPath();
          context.rect(annotation.x, annotation.y, annotation.width, annotation.height);
          context.strokeStyle = 'blue';
          context.stroke();
        });
      };
      image.src = imageUrl;
    }
  }, [imageUrl, annotations, points]);

  const handleCanvasEvent = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const xx = event.clientX
    const yy = event.clientY

    if (mode === 'draw-point') {
      setPoints({ xx, yy });
    } else if (mode === 'draw-box' && isDrawing) {
      setEndPoint({ x, y });
    }
  };

  const handleCanvasMouseDown = (event) => {
    if (mode === 'draw-point') {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      setPoints([...points, { x, y }])}
      if (mode === 'draw-box') {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        setStartPoint({ x, y });
        setIsDrawing(true);
      }
    };

    const handleCanvasMouseMove = (event) => {
      if (!isDrawing) return;
      const rect = event.target.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // 캔버스 크기 내에서 시작점과 끝점의 좌표를 설정합니다.
      const startX = Math.min(Math.max(0, startPoint.x), canvasRef.current.width);
      const startY = Math.min(Math.max(0, startPoint.y), canvasRef.current.height);
      const endX = Math.min(Math.max(0, x), canvasRef.current.width);
      const endY = Math.min(Math.max(0, y), canvasRef.current.height);

      setEndPoint({ x: endX, y: endY });
    };

    const handleCanvasMouseUp = () => {
      if (mode === 'draw-box') {
        setIsDrawing(false);
        const width = Math.abs(endPoint.x - startPoint.x);
        const height = Math.abs(endPoint.y - startPoint.y);
        if (width > 0 && height > 0) {
          setAnnotations([...annotations, {
            x: Math.min(startPoint.x, endPoint.x),
            y: Math.min(startPoint.y, endPoint.y),
            width,
            height,
            text: currentAnnotation
          }]);
        }
      }
    };

    const handleImageChange = (event) => {
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onloadend = () => {
        setImageUrl(reader.result);
      };

      if (file) {
        reader.readAsDataURL(file);
      }
    };

    const handleAnnotationChange = (event) => {
      setCurrentAnnotation(event.target.value);
    };

    return (
      <div>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="fileUpload" style={{ marginRight: '10px' }}>이미지 업로드:</label>
          <input id="fileUpload" type="file" onChange={handleImageChange} />
          <button
            onClick={handleClearAnnotations}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              margin: '10px',
              textTransform: 'uppercase',
              fontWeight: 'bold',
              borderRadius: '5px',
              boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
              cursor: 'pointer'
            }}
          >
            바운딩 박스 초기화
          </button>
        </div>
        <div>
          <button
            onClick={() => setMode('draw-box')}
            style={{
              marginRight: '10px',
              backgroundColor: '#f44336',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            바운딩 박스 그리기
          </button>
          <button
            onClick={() => setMode('draw-point')}
            style={{
              backgroundColor: '#2196F3',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            점 찍기
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width="800"
          height="600"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={mode === 'draw-box' ? handleCanvasMouseMove : null}
          onMouseUp={handleCanvasMouseUp}
          style={{ border: '1px solid black', marginTop: '10px' }}
        />
      </div>
    );
  }