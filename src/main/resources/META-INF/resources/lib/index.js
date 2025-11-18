import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			suspense: true,
			useErrorBoundary: true
		}
	}
  });

export function view(elementId, portletParams) {
	console.log("react main");
	console.log('view Parameter: ', portletParams);
	const root = createRoot(document.getElementById(elementId));
	root.render(
		<QueryClientProvider client={queryClient}>
			<App appParams={portletParams}/>
		</QueryClientProvider>
	  
	);
}