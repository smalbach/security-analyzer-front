import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';

export function AnimatedFlowEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isAnimated = (data as Record<string, unknown>)?.animated === true;

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: 'var(--text-secondary, #6b7280)',
          strokeWidth: 2,
          ...style,
          ...(isAnimated
            ? {
                strokeDasharray: '5,5',
                animation: 'flowEdgeDash 0.5s linear infinite',
              }
            : {}),
        }}
      />
      {label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-[10px] fill-current"
          style={{ color: 'var(--text-secondary, #a0a0b0)' }}
        >
          {String(label)}
        </text>
      )}
    </>
  );
}
