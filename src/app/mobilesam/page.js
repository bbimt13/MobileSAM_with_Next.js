'use client'

import { useEffect, useRef } from 'react';
import Head from 'next/head';
import * as ort from 'onnxruntime-web';
import * as tf from '@tensorflow/tfjs';

const IndexPage = () => {
  const canvasRef = useRef(null); // canvas 참조 생성

  // ORT(ONNX Runtime Web) 초기화 함수
  function initializeOrt() {
    // ONNX Runtime Web을 위한 WASM 파일 경로 설정
    ort.env.wasm.wasmPaths = {
      'ort-wasm.wasm': 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.14.0/ort-wasm.wasm',
      'ort-wasm-simd.wasm': 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.14.0/ort-wasm-simd.wasm',
      'ort-wasm-threaded.wasm': 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.14.0/ort-wasm-threaded.wasm'
    };
  }

  useEffect(() => {
    const dimension = 1024;
    let image_embeddings;
    let imageImageData;

    // 캔버스 클릭 시 이벤트 핸들러
    async function handleClick(event) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // 클릭된 위치에 대한 로깅 및 사용자에게 상태 표시
      console.log('Clicked position:', x, y);
      document.getElementById("status").textContent = `Clicked on (${x}, ${y}). Downloading the decoder model if needed and generating mask...`;

      let context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = imageImageData.width;
      canvas.height = imageImageData.height;
      context.putImageData(imageImageData, 0, 0);
      context.fillStyle = 'green';
      context.fillRect(x, y, 10, 10); // 클릭한 위치에 직사각형 그리기

      // ORT 입력 텐서 생성
      const pointCoords = new ort.Tensor(new Float32Array([x, y, 0, 0]), [1, 2, 2]);
      const pointLabels = new ort.Tensor(new Float32Array([0, -1]), [1, 2]);
      const maskInput = new ort.Tensor(new Float32Array(256 * 256), [1, 1, 256, 256]);
      const hasMask = new ort.Tensor(new Float32Array([0]), [1,]);
      const origianlImageSize = new ort.Tensor(new Float32Array([684, 1024]), [2,]);

      // 모델 세션 초기화 및 실행
      await initializeOrt();
      ort.env.wasm.numThreads = 1;
      const decodingSession = await ort.InferenceSession.create('/models/mobilesam.decoder.quant.onnx');
      console.log("Decoder session", decodingSession);
      const decodingFeeds = {
        "image_embeddings": image_embeddings,
        "point_coords": pointCoords,
        "point_labels": pointLabels,
        "mask_input": maskInput,
        "has_mask_input": hasMask,
        "orig_im_size": origianlImageSize
      };

      let start = Date.now();
      try {
        let results = await decodingSession.run(decodingFeeds);
        console.log("Generated mask:", results);
        const mask = results.masks;
        const maskImageData = mask.toImageData();
        context.globalAlpha = 0.5;
        let imageBitmap = await createImageBitmap(maskImageData);
        context.drawImage(imageBitmap, 0, 0);
      } catch (error) {
        console.log(`caught error: ${error}`);
      }
      let end = Date.now();
      console.log(`generating masks took ${(end - start) / 1000} seconds`);
      document.getElementById("status").textContent = `Mask generated. Click on the image to generate new mask.`;
    }

    // 이미지 로드 및 처리 함수
    async function handleImage(img) {
      document.getElementById("status").textContent = `Uploaded image is ${img.width}x${img.height}px. Loading the encoder model (~28 MB).`;
      const scaleX = dimension / img.width;
      const scaleY = dimension / img.height;

      ort.env.wasm.numThreads = 1;
      const options = { resizedWidth: 1024, resizedHeight: 684 };
      const resizedTensor = await ort.Tensor.fromImage(img, options);
      const resizeImage = resizedTensor.toImageData();
      let imageDataTensor = await ort.Tensor.fromImage(resizeImage);

      imageImageData = imageDataTensor.toImageData();
      canvas.width = imageImageData.width;
      canvas.height = imageImageData.height;
      let context = canvas.getContext('2d');
      context.putImageData(imageImageData, 0, 0);

      let tf_tensor = tf.tensor(imageDataTensor.data, imageDataTensor.dims);
      tf_tensor = tf_tensor.reshape([3, 684, 1024]);
      tf_tensor = tf_tensor.transpose([1, 2, 0]).mul(255);
      imageDataTensor = new ort.Tensor(tf_tensor.dataSync(), tf_tensor.shape);

      await initializeOrt();
      const session = await ort.InferenceSession.create('/models/mobilesam.encoder.onnx');
      const feeds = { "input_image": imageDataTensor };
      let start = Date.now();
      let results;
      try {
        results = await session.run(feeds);
        image_embeddings = results.image_embeddings;
      } catch (error) {
        console.log(`caught error: ${error}`);
        document.getElementById("status").textContent = `Error: ${error}`;
      }
      let end = Date.now();
      let time_taken = (end - start) / 1000;
      document.getElementById("status").textContent = `Embedding generated in ${time_taken} seconds. Click on the image to generate a mask.`;

      canvas.addEventListener('click', handleClick);
    }

    // 파일 선택 시 이미지 로딩 함수 연결
    function loadImage(fileReader) {
      let img = document.getElementById("original-image");
      img.onload = () => handleImage(img);
      img.src = fileReader.result;
    }

    // 메인 함수, 파일 입력 처리를 위한 이벤트 리스너 설정
    async function main() {
      document.getElementById("file-in").onchange = function (evt) {
        let target = evt.target || window.event.src, files = target.files;
        if (FileReader && files && files.length) {
          let fileReader = new FileReader();
          fileReader.onload = () => loadImage(fileReader);
          fileReader.readAsDataURL(files[0]);
        }
      };
    }

    main(); // 메인 함수 실행

    // Cleanup function (현재 불필요하지만 필요시 사용 가능)
    return () => {};
  }, []);

  return (
    <div>
      <Head>
        <title>MobileSAM in the Browser</title>
        <link rel="stylesheet" href="css/styles.css" />
      </Head>
      <div id="main">
        <label htmlFor="file-in">Upload Image</label>
        <input title="Image from File" type="file" id="file-in" name="file-in" />
        <div style={{ display: 'none' }}>
          <img id="original-image" src="#" alt="Original" />
        </div>
        <span id="status">No image uploaded</span>
        <canvas id="canvas" ref={canvasRef}></canvas>
      </div>
    </div>
  );
};

export default IndexPage;
