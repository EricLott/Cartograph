import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'Inter, system-ui, sans-serif',
});

const DependencyGraph = ({ pillars }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (pillars && pillars.length > 0 && chartRef.current) {
      const buildGraph = (nodes, parentId = null) => {
        let lines = [];
        nodes.forEach(node => {
          const nodeId = node.id.replace(/-/g, '_');
          lines.push(`${nodeId}["${node.title}"]`);
          if (parentId) {
            lines.push(`${parentId} --> ${nodeId}`);
          }
          if (node.subcategories && node.subcategories.length > 0) {
            lines = lines.concat(buildGraph(node.subcategories, nodeId));
          }
        });
        return lines;
      };

      const graphDefinition = `graph TD\n  ${buildGraph(pillars).join('\n  ')}`;
      
      chartRef.current.removeAttribute('data-processed');
      chartRef.current.innerHTML = graphDefinition;
      
      mermaid.contentLoaded();
    }
  }, [pillars]);

  return (
    <div className="dependency-graph-container glass-panel" style={{ 
      padding: '1rem', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden' 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Project Dependency Graph</h3>
        <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Auto-generated from architectural pillars</span>
      </div>
      <div 
        ref={chartRef} 
        className="mermaid" 
        style={{ 
          flex: 1, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          overflow: 'auto',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: '8px'
        }}
      >
        {(!pillars || pillars.length === 0) && <p>No architecture defined yet. Describe your idea to see the graph.</p>}
      </div>
    </div>
  );
};

export default DependencyGraph;
