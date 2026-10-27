import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getShapeById } from '../game/shapes.js';
import { sameGeometry } from './useBoardGeometry.jsx';
export function calculateDrag(clientX, clientY, grip, shape, geometry, touch) {
  const width = shape.cols * geometry.cellWidth + (shape.cols - 1) * geometry.gapX;
  const height = shape.rows * geometry.cellHeight + (shape.rows - 1) * geometry.gapY;
  const left = clientX - grip.x * width;
  const top = clientY - grip.y * height - (touch ? 48 : 0);
  return {
    left,
    top,
    width,
    height,
    cellWidth: geometry.cellWidth,
    cellHeight: geometry.cellHeight,
    gapX: geometry.gapX,
    gapY: geometry.gapY,
    candidate: {
      row: Math.round((top - geometry.top) / geometry.pitchY),
      col: Math.round((left - geometry.left) / geometry.pitchX)
    }
  };
}
const transformFor = position => `translate3d(${position.left}px, ${position.top}px, 0)`;
export function usePieceDrag({
  geometryRef,
  measure,
  disabled,
  reduced,
  isValidCandidate,
  onSelect,
  onDrop,
  onPickup,
  onCancel
}) {
  const gesture = useRef(null);
  const latest = useRef(null);
  const frame = useRef(null);
  const overlayNode = useRef(null);
  const position = useRef(null);
  const returning = useRef(null);
  const [drag, setDrag] = useState(null);
  useLayoutEffect(() => {
    latest.current = {
      disabled,
      reduced,
      isValidCandidate,
      onSelect,
      onDrop,
      onPickup,
      onCancel
    };
  }, [disabled, reduced, isValidCandidate, onSelect, onDrop, onPickup, onCancel]);
  const stopFrame = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);
  const stopReturn = useCallback(() => {
    if (returning.current) {
      clearTimeout(returning.current.timer);
      returning.current.animation?.cancel();
      returning.current = null;
    }
  }, []);
  const release = useCallback(() => {
    const active = gesture.current;
    // Clear first: releasePointerCapture may immediately deliver lost capture.
    gesture.current = null;
    if (active?.target.hasPointerCapture?.(active.id)) active.target.releasePointerCapture(active.id);
    return active;
  }, []);
  const clearResources = useCallback(() => {
    stopFrame();
    stopReturn();
    release();
    position.current = null;
    if (overlayNode.current) overlayNode.current.style.willChange = '';
  }, [stopFrame, stopReturn, release]);
  const cancelDrag = useCallback(() => {
    const hadInteraction = !!gesture.current || !!returning.current;
    clearResources();
    setDrag(null);
    if (hadInteraction) latest.current.onCancel();
  }, [clearResources]);
  const startReturnAnimation = useCallback(node => {
    const flight = returning.current;
    if (!flight || flight.animation || !node.animate) return;
    flight.animation = node.animate([{
      transform: transformFor(flight.from),
      opacity: 0.94
    }, {
      transform: flight.to,
      opacity: 0.15
    }], {
      duration: 150,
      easing: 'cubic-bezier(.2,.7,.3,1)',
      fill: 'forwards'
    });
  }, []);
  const overlayRef = useCallback(node => {
    if (overlayNode.current) overlayNode.current.style.willChange = '';
    overlayNode.current = node;
    if (node && position.current) {
      node.style.transform = transformFor(position.current);
      node.style.willChange = 'transform';
      startReturnAnimation(node);
    }
  }, [startReturnAnimation]);
  useLayoutEffect(() => {
    if (disabled) cancelDrag();
  }, [disabled, cancelDrag]);
  useLayoutEffect(() => {
    if (reduced && returning.current) {
      clearResources();
      setDrag(null);
    }
  }, [reduced, clearResources]);
  useEffect(() => {
    const escape = event => {
      if (event.key === 'Escape') {
        if (gesture.current || returning.current) cancelDrag();else latest.current.onCancel();
      }
    };
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('keydown', escape);
      clearResources();
    };
  }, [cancelDrag, clearResources]);
  const publish = (active, point) => {
    position.current = point;
    if (overlayNode.current) overlayNode.current.style.transform = transformFor(point);
    const valid = latest.current.isValidCandidate(active.piece, point.candidate);
    const before = active.preview;
    if (!before || before.row !== point.candidate.row || before.col !== point.candidate.col || before.valid !== valid) {
      active.preview = {
        ...point.candidate,
        valid
      };
      // Only the snapped preview enters React; raw pointer coordinates never do.
      setDrag({
        piece: active.piece,
        width: point.width,
        height: point.height,
        cellWidth: point.cellWidth,
        cellHeight: point.cellHeight,
        gapX: point.gapX,
        gapY: point.gapY,
        candidate: point.candidate,
        valid,
        phase: 'dragging'
      });
    }
  };
  const handlers = piece => ({
    onPointerDown: event => {
      if (latest.current.disabled || gesture.current || event.button !== 0 || !event.isPrimary) return;
      clearResources();
      setDrag(null);
      const target = event.currentTarget;
      const source = target.querySelector('.piece-shape').getBoundingClientRect();
      const geometry = measure() || geometryRef.current;
      target.focus({
        preventScroll: true
      });
      target.setPointerCapture(event.pointerId);
      gesture.current = {
        id: event.pointerId,
        target,
        piece,
        shape: getShapeById(piece.shapeId),
        source,
        geometry: geometry ? {
          ...geometry
        } : null,
        startX: event.clientX,
        startY: event.clientY,
        x: event.clientX,
        y: event.clientY,
        grip: {
          x: Math.max(0, Math.min(1, source.width > 0 ? (event.clientX - source.left) / source.width : 0.5)),
          y: Math.max(0, Math.min(1, source.height > 0 ? (event.clientY - source.top) / source.height : 0.5))
        },
        touch: event.pointerType === 'touch',
        moved: false,
        preview: null
      };
      latest.current.onPickup();
    },
    onPointerMove: event => {
      const active = gesture.current;
      if (!active || event.pointerId !== active.id || latest.current.disabled) return;
      active.x = event.clientX;
      active.y = event.clientY;
      if (!active.moved && Math.hypot(active.x - active.startX, active.y - active.startY) < 6) return;
      active.moved = true;
      if (!active.geometry || active.geometry.cellWidth <= 0 || active.geometry.cellHeight <= 0 || active.source.width <= 0 || active.source.height <= 0) return;
      if (frame.current !== null) return;
      const frameId = requestAnimationFrame(() => {
        if (frame.current !== frameId) return;
        frame.current = null;
        // A cancelled frame must not restore an overlay, even after a new pickup.
        if (gesture.current !== active || latest.current.disabled) return;
        publish(active, calculateDrag(active.x, active.y, active.grip, active.shape, active.geometry, active.touch));
      });
      frame.current = frameId;
    },
    onPointerUp: event => {
      const active = gesture.current;
      if (!active || event.pointerId !== active.id) return;
      stopFrame();
      if (latest.current.disabled) {
        cancelDrag();
        return;
      }
      const moved = active.moved || Math.hypot(event.clientX - active.startX, event.clientY - active.startY) >= 6;
      if (!moved) {
        release();
        setDrag(null);
        latest.current.onSelect(active.piece);
        return;
      }
      const geometry = measure() || geometryRef.current;
      if (!sameGeometry(active.geometry, geometry) || geometry.cellWidth <= 0 || geometry.cellHeight <= 0 || active.source.width <= 0 || active.source.height <= 0) {
        cancelDrag();
        return;
      }
      release();
      // Flush release coordinates synchronously; never use a pending frame/React candidate.
      const final = calculateDrag(event.clientX, event.clientY, active.grip, active.shape, geometry, active.touch);
      publish(active, final);
      const valid = latest.current.isValidCandidate(active.piece, final.candidate);
      if (!valid && !latest.current.reduced) {
        const flight = {
          from: final,
          to: `translate3d(${active.source.left}px, ${active.source.top}px, 0) scale(${active.source.width / final.width}, ${active.source.height / final.height})`,
          animation: null,
          timer: null
        };
        returning.current = flight;
        setDrag({
          piece: active.piece,
          ...final,
          candidate: null,
          valid: false,
          phase: 'returning'
        });
        if (overlayNode.current) startReturnAnimation(overlayNode.current);
        flight.timer = setTimeout(() => {
          if (returning.current !== flight) return;
          clearResources();
          setDrag(null);
        }, 150);
      } else {
        clearResources();
        setDrag(null);
      }
      latest.current.onDrop(active.piece, final.candidate);
    },
    onPointerCancel: event => {
      if (gesture.current?.id === event.pointerId) cancelDrag();
    },
    onLostPointerCapture: event => {
      if (gesture.current?.id === event.pointerId) cancelDrag();
    },
    onClick: event => {
      if (event.detail !== 0 || latest.current.disabled) return;
      if (returning.current) {
        clearResources();
        setDrag(null);
      }
      latest.current.onSelect(piece);
    },
    onDragStart: event => event.preventDefault()
  });
  return {
    drag,
    overlayRef,
    cancelDrag,
    handlers
  };
}
