/**
 * TreeConnections - SVG overlay drawing bezier curves between connected nodes.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useTheme, alpha } from '@mui/material/styles';
import type { TreeConnection } from '../../../../features/infrastructure/types';

interface TreeConnectionsProps {
  connections: TreeConnection[];
  nodeRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  selectedNodeKey: string | null;
  highlightedConnectionKeys: Set<string>;
}

export function TreeConnections({
  connections,
  nodeRefs,
  canvasRef,
  selectedNodeKey,
  highlightedConnectionKeys,
}: TreeConnectionsProps) {
  const theme = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);

  const drawConnections = useCallback(() => {
    const svg = svgRef.current;
    const canvas = canvasRef.current;
    if (!svg || !canvas) return;

    const canvasRect = canvas.getBoundingClientRect();

    // Calculate positions
    const positions = new Map<string, {
      x: number; y: number; top: number; bottom: number; left: number; right: number;
    }>();

    nodeRefs.current.forEach((el, key) => {
      const rect = el.getBoundingClientRect();
      positions.set(key, {
        x: rect.left - canvasRect.left + canvas.scrollLeft + rect.width / 2,
        y: rect.top - canvasRect.top + canvas.scrollTop + rect.height / 2,
        top: rect.top - canvasRect.top + canvas.scrollTop,
        bottom: rect.bottom - canvasRect.top + canvas.scrollTop,
        left: rect.left - canvasRect.left + canvas.scrollLeft,
        right: rect.right - canvasRect.left + canvas.scrollLeft,
      });
    });

    // Size SVG
    let maxX = canvas.scrollWidth;
    let maxY = canvas.scrollHeight;
    positions.forEach(pos => {
      if (pos.right + 50 > maxX) maxX = pos.right + 50;
      if (pos.bottom + 50 > maxY) maxY = pos.bottom + 50;
    });

    svg.setAttribute('width', String(maxX));
    svg.setAttribute('height', String(maxY));

    const defaultColor = alpha(theme.palette.text.primary, 0.15);
    const highlightColor = theme.palette.primary.main;
    const dimColor = alpha(theme.palette.text.primary, 0.05);

    let content = '';

    connections.forEach(conn => {
      const from = positions.get(conn.from);
      const to = positions.get(conn.to);
      if (!from || !to) return;

      const connKey = `${conn.from}->${conn.to}`;
      const isHighlighted = highlightedConnectionKeys.has(connKey);
      const isDimmed = selectedNodeKey !== null && !isHighlighted;

      const color = isHighlighted ? highlightColor : isDimmed ? dimColor : defaultColor;
      const strokeWidth = isHighlighted ? 2 : 1.5;
      const circleR = isHighlighted ? 3 : 2;

      let startX: number, startY: number, endX: number, endY: number, pathD: string;

      if (conn.type === 'bm-adaccount') {
        startX = from.left - 4;
        startY = from.y;
        endX = to.right + 4;
        endY = to.y;
        const midX = (startX + endX) / 2;
        pathD = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
      } else if (conn.type === 'bm-pixel') {
        startX = from.right + 4;
        startY = from.y;
        endX = to.left - 4;
        endY = to.y;
        const midX = (startX + endX) / 2;
        pathD = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
      } else if (conn.type === 'profile-page') {
        startX = from.x;
        startY = from.top - 4;
        endX = to.x;
        endY = to.bottom + 4;
        const midY = (startY + endY) / 2;
        pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
      } else {
        // profile-bm: vertical downward
        startX = from.x;
        startY = from.bottom + 4;
        endX = to.x;
        endY = to.top - 4;
        const midY = (startY + endY) / 2;
        pathD = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
      }

      content += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" />`;
      content += `<circle cx="${startX}" cy="${startY}" r="${circleR}" fill="${color}" />`;
      content += `<circle cx="${endX}" cy="${endY}" r="${circleR}" fill="${color}" />`;
    });

    svg.innerHTML = content;
  }, [connections, nodeRefs, canvasRef, selectedNodeKey, highlightedConnectionKeys, theme]);

  // Redraw on data changes
  useEffect(() => {
    const timer = setTimeout(drawConnections, 60);
    return () => clearTimeout(timer);
  }, [drawConnections]);

  // ResizeObserver
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(() => {
      drawConnections();
    });
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [canvasRef, drawConnections]);

  // Scroll listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleScroll = () => drawConnections();
    canvas.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      canvas.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [canvasRef, drawConnections]);

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    />
  );
}
