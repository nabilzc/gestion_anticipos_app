"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
    onSignatureChange: (signature: string | null) => void;
}

export default function SignaturePad({ onSignatureChange }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        initCanvas();
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleResize = () => {
        // We optionally save and restore the canvas content on resize, 
        // but for simplicity we will just re-init to keep it bounded.
        initCanvas();
    };

    const initCanvas = () => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set display size (css pixels)
        const rect = container.getBoundingClientRect();

        // Set actual size in memory (scaled to account for extra pixel density)
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        // Normalize coordinate system to use css pixels
        ctx.scale(dpr, dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#0f172a'; // dark slate
    };

    const getPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): [number, number] | null => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        return [clientX - rect.left, clientY - rect.top];
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (e.cancelable) e.preventDefault();
        setIsDrawing(true);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const pos = getPos(e);
        if (!ctx || !pos) return;

        ctx.beginPath();
        ctx.moveTo(pos[0], pos[1]);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        if (e.cancelable) e.preventDefault();

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const pos = getPos(e);
        if (!ctx || !pos) return;

        ctx.lineTo(pos[0], pos[1]);
        ctx.stroke();
        setHasSignature(true);
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        saveCanvas();
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
        onSignatureChange(null);
    };

    const saveCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Only save if there's actual drawing
        if (hasSignature) {
            const dataURL = canvas.toDataURL('image/png');
            onSignatureChange(dataURL);
        } else {
            onSignatureChange(null);
        }
    };

    return (
        <div className="signature-pad-wrapper" style={{ width: '100%' }}>
            <div
                ref={containerRef}
                className="signature-pad-container"
                style={{
                    width: '100%',
                    height: '200px',
                    border: '1.5px dashed var(--border)',
                    borderRadius: 'var(--radius)',
                    backgroundColor: '#f8fafc',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{ cursor: 'crosshair', touchAction: 'none' }}
                />
                <button
                    type="button"
                    onClick={clearCanvas}
                    title="Limpiar firma"
                    style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: 'white',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        padding: '6px',
                        color: 'var(--muted-foreground)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                >
                    <Eraser size={16} />
                </button>
            </div>
        </div>
    );
}
