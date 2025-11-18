import { Suspense } from 'react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layout/main-layout';
import { LoadingSpinner } from './layout/loading-spinner';

//lazy 선언
const Definiton = lazy(() => import('./plan/visit-definition'));
const VisitPlan = lazy(() => import('./event/visit-plan'));
const Calendar = lazy(() => import('./event/visit-calendar'));
const AddVisit = lazy(() => import('./event/add-visit'));
const VisitStatus = lazy(() => import('./pages/visit-status'));


function App({appParams}) {
    return(
        <MemoryRouter>
            <Suspense fallback={<LoadingSpinner/>}>
                <Routes>
                    <Route path="/visit" element={<MainLayout/>}>
                        <Route path="/visit/definition" element={<Definiton {...appParams}/>}/>
                        <Route path="/visit/plan" element={<VisitPlan {...appParams}/>}/>
                        <Route path="/visit/calendar" element={<Calendar {...appParams}/>}/>
                        <Route path="/visit/add" element={<AddVisit {...appParams}/>}/>
                        <Route path="/visit/state" element={<VisitStatus {...appParams}/>}/>
                    </Route>
                </Routes>
            </Suspense>
        </MemoryRouter>
    );
}

export default App;