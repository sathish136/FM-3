import { useState, useCallback } from "react";
import type { TreeNode } from "@/lib/stepLoader";

interface MeshesPanelProps {
  root: TreeNode | null;
  totalMeshes: number;
  hiddenMeshes: Set<number>;
  onToggleMesh: (indices: number[], hidden: boolean) => void;
  onFitToPart: (indices: number[]) => void;
}

function collectAll(node: TreeNode): number[] {
  return [...node.meshIndices, ...node.children.flatMap(collectAll)];
}

function isNodeVisible(node: TreeNode, hiddenMeshes: Set<number>): boolean {
  const all = collectAll(node);
  if (all.length === 0) return true;
  return all.some((i) => !hiddenMeshes.has(i));
}

function isNodeFullyHidden(node: TreeNode, hiddenMeshes: Set<number>): boolean {
  const all = collectAll(node);
  if (all.length === 0) return false;
  return all.every((i) => hiddenMeshes.has(i));
}

// Icons
function IconExpand() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="4,6 8,10 12,6" />
    </svg>
  );
}
function IconCollapse() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="4,10 8,6 12,10" />
    </svg>
  );
}
function IconFit() {
  return (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.3">
      <polyline points="1,5 1,1 5,1" />
      <polyline points="11,1 15,1 15,5" />
      <polyline points="15,11 15,15 11,15" />
      <polyline points="5,15 1,15 1,11" />
      <rect x="4" y="4" width="8" height="8" />
    </svg>
  );
}
function IconEye({ visible }: { visible: boolean }) {
  return visible ? (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" strokeDasharray="2,1" />
      <line x1="2" y1="2" x2="14" y2="14" />
    </svg>
  );
}
function IconCircle() {
  return <div className="w-2 h-2 rounded-full border border-gray-500 flex-shrink-0" />;
}

interface NodeRowProps {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  hiddenMeshes: Set<number>;
  onToggleExpand: (id: string) => void;
  onToggleMesh: (indices: number[], hidden: boolean) => void;
  onFitToPart: (indices: number[]) => void;
}

function NodeRow({ node, depth, expanded, hiddenMeshes, onToggleExpand, onToggleMesh, onFitToPart }: NodeRowProps) {
  const allIndices = collectAll(node);
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const visible = isNodeVisible(node, hiddenMeshes);
  const hidden = isNodeFullyHidden(node, hiddenMeshes);

  return (
    <>
      <div
        className="group flex items-center gap-1 px-2 py-[3px] hover:bg-white/5 rounded cursor-default select-none"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {/* Expand/collapse or leaf indicator */}
        <button
          className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-gray-500 hover:text-gray-300"
          onClick={() => hasChildren && onToggleExpand(node.id)}
        >
          {hasChildren ? (
            isExpanded ? <IconExpand /> : <IconCollapse />
          ) : (
            <IconCircle />
          )}
        </button>

        {/* Name */}
        <span
          className={`flex-1 text-[11px] truncate ${hidden ? "text-gray-600 line-through" : "text-gray-200"}`}
          title={node.name}
        >
          {node.name || "Unnamed"}
        </span>

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {allIndices.length > 0 && (
            <button
              className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-blue-400 rounded hover:bg-white/10"
              title="Fit to part"
              onClick={() => onFitToPart(allIndices)}
            >
              <IconFit />
            </button>
          )}
          {allIndices.length > 0 && (
            <button
              className={`w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 ${
                visible ? "text-gray-400 hover:text-white" : "text-gray-600 hover:text-gray-400"
              }`}
              title={visible ? "Hide" : "Show"}
              onClick={() => onToggleMesh(allIndices, visible)}
            >
              <IconEye visible={visible} />
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && node.children.map((child) => (
        <NodeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          hiddenMeshes={hiddenMeshes}
          onToggleExpand={onToggleExpand}
          onToggleMesh={onToggleMesh}
          onFitToPart={onFitToPart}
        />
      ))}
    </>
  );
}

function collectAllIds(node: TreeNode): string[] {
  return [node.id, ...node.children.flatMap(collectAllIds)];
}

export default function MeshesPanel({
  root,
  totalMeshes,
  hiddenMeshes,
  onToggleMesh,
  onFitToPart,
}: MeshesPanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Start with root expanded
    return new Set(["root-0"]);
  });

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    if (!root) return;
    setExpanded(new Set(collectAllIds(root)));
  }, [root]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const allIndices = root ? collectAll(root) : [];
  const allHidden = allIndices.every((i) => hiddenMeshes.has(i));
  const anyHidden = allIndices.some((i) => hiddenMeshes.has(i));

  const toggleAllVisibility = () => {
    if (allHidden) {
      onToggleMesh(allIndices, false); // show all
    } else {
      onToggleMesh(allIndices, true); // hide all
    }
  };

  return (
    <div className="w-56 bg-[#13131f] border-l border-white/10 flex flex-col flex-shrink-0 h-full">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-white/10 flex-shrink-0">
        <div className="text-xs font-semibold text-gray-200 mb-2">Meshes</div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5">
          {/* List/hierarchy icon */}
          <button className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-white/10" title="Tree view">
            <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.3">
              <line x1="2" y1="3" x2="12" y2="3" />
              <line x1="4" y1="7" x2="12" y2="7" />
              <line x1="4" y1="11" x2="12" y2="11" />
              <line x1="2" y1="3" x2="2" y2="11" />
            </svg>
          </button>

          {/* Collapse all */}
          <button
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-white/10"
            title="Collapse all"
            onClick={collapseAll}
          >
            <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.3">
              <polyline points="2,10 7,4 12,10" />
            </svg>
          </button>

          {/* Expand all */}
          <button
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white rounded hover:bg-white/10"
            title="Expand all"
            onClick={expandAll}
          >
            <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.3">
              <polyline points="2,4 7,10 12,4" />
            </svg>
          </button>

          <div className="flex-1" />

          {/* Fit all */}
          <button
            className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-blue-400 rounded hover:bg-white/10"
            title="Fit all to view"
            onClick={() => onFitToPart(allIndices)}
          >
            <svg viewBox="0 0 14 14" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.2">
              <polyline points="1,4 1,1 4,1" />
              <polyline points="10,1 13,1 13,4" />
              <polyline points="13,10 13,13 10,13" />
              <polyline points="4,13 1,13 1,10" />
            </svg>
          </button>

          {/* Toggle all visibility */}
          <button
            className={`w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 ${
              anyHidden ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-white"
            }`}
            title={allHidden ? "Show all" : "Hide all"}
            onClick={toggleAllVisibility}
          >
            <IconEye visible={!allHidden} />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1">
        {root ? (
          <NodeRow
            node={root}
            depth={0}
            expanded={expanded}
            hiddenMeshes={hiddenMeshes}
            onToggleExpand={toggleExpand}
            onToggleMesh={onToggleMesh}
            onFitToPart={onFitToPart}
          />
        ) : (
          <div className="text-[11px] text-gray-500 px-3 py-2">No parts loaded</div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-white/10 text-[10px] text-gray-500 flex-shrink-0">
        {totalMeshes} part{totalMeshes !== 1 ? "s" : ""}
        {hiddenMeshes.size > 0 && ` · ${hiddenMeshes.size} hidden`}
      </div>
    </div>
  );
}
