import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

const ReactRenderer = ({ code }) => {
  const [error, setError] = useState(null);
  const [Component, setComponent] = useState(null);

  useEffect(() => {
    if (!code) return;

    try {
      // Clean the code
      let cleanCode = code.trim();
      
      // Remove import statements (we'll provide React)
      cleanCode = cleanCode.replace(/import.*from.*['"];?\n?/g, '');
      
      // Remove export statements
      cleanCode = cleanCode.replace(/export\s+default\s+/g, '');
      
      // Create a function that returns the component
      const componentCode = `
        const { useState, useEffect, useRef } = React;
        ${cleanCode}
        return App;
      `;
      
      // Create function and get component
      const createComponent = new Function('React', componentCode);
      const AppComponent = createComponent(React);
      
      setComponent(() => AppComponent);
      setError(null);
    } catch (err) {
      console.error('Error rendering React component:', err);
      setError(err.message);
    }
  }, [code]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 p-8">
        <div className="max-w-2xl w-full bg-white rounded-lg border-2 border-red-200 p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">Rendering Error</h3>
              <p className="text-sm text-red-700 mb-4">
                There was an error rendering the React component. This might be due to syntax issues or missing dependencies.
              </p>
              <div className="bg-red-100 rounded p-3 font-mono text-xs text-red-800 overflow-auto">
                {error}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Preparing React component...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto">
      <Component />
    </div>
  );
};

export default ReactRenderer;
