import React, { lazy, Suspense } from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layout/main-layout';
import { LoadingSpinner } from './layout/loading-spinner';

//lazy 선언
const VisitDefiniton = lazy(() => import('./visit/plan/visit-definition'));
const VisitPlan = lazy(() => import('./visit/plan/visit-plan'));
const VisitCalendar = lazy(() => import('./visit/event/visit-calendar'));
const AddVisit = lazy(() => import('./visit/event/add-visit'));
const VisitStatus = lazy(() => import('./visit/event/visit-status'));


function App({appParams}) {
    return(
        <MemoryRouter>
            <Suspense fallback={<LoadingSpinner/>}>
                <Routes>
                    <Route path="/" element={<Navigate to="/visit" replace />}/>
                    <Route path="/visit" element={<MainLayout/>}>
                        <Route path="/visit/definition" element={<VisitDefiniton {...appParams}/>}/>
                        <Route path="/visit/plan" element={<VisitPlan {...appParams}/>}/>
                        <Route path="/visit/calendar" element={<VisitCalendar {...appParams}/>}/>
                        <Route path="/visit/add" element={<AddVisit {...appParams}/>}/>
                        <Route path="/visit/state" element={<VisitStatus {...appParams}/>}/>
                    </Route>
                </Routes>
            </Suspense>
        </MemoryRouter>
    );
}

export default App;