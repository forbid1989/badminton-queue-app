'use client'

import  BadmintonQueueUI  from './BadmintonQueueUI'

export default function Home() {
  return (
    <>
      {/* Hidden SEO content */}
      <div style={{ position: 'absolute', left: '-9999px', opacity: 0 }}>
        <h1>Queue Maestro - Professional Court Queue Management</h1>
        <p>Streamline your racket sports facility with our digital queue management system. Perfect for badminton courts, tennis clubs, pickleball venues, and table tennis centers.</p>
        <h2>Features</h2>
        <ul>
          <li>Real-time player queue management</li>
          <li>Drag-and-drop court assignments</li>
          <li>Payment tracking and management</li>
          <li>Multi-court support</li>
          <li>Player statistics and game history</li>
        </ul>
      </div>
      <BadmintonQueueUI />
    </>
  )
}