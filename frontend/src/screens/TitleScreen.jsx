import React, { useState, useCallback } from 'react';
import starLoopVideo from '../assets/StarLoop.mp4';
import titleQrCode from '../assets/QR Code.png';
import astraIcon from '../assets/astraIcon.png';

const STATIC_CONSTELLATION_STARS = [
  { id: 's1', left: '8%', top: '18%', size: 4 },
  { id: 's2', left: '14%', top: '22%', size: 3 },
  { id: 's3', left: '20%', top: '17%', size: 4 },
  { id: 's4', left: '76%', top: '16%', size: 4 },
  { id: 's5', left: '81%', top: '20%', size: 3 },
  { id: 's6', left: '87%', top: '14%', size: 4 },
  { id: 's7', left: '11%', top: '72%', size: 4 },
  { id: 's8', left: '16%', top: '76%', size: 3 },
  { id: 's9', left: '23%', top: '71%', size: 4 },
  { id: 's10', left: '74%', top: '74%', size: 4 },
  { id: 's11', left: '79%', top: '68%', size: 3 },
  { id: 's12', left: '86%', top: '72%', size: 4 },
];

const STATIC_CONSTELLATION_LINES = [
  { id: 'l1', left: '8.2%', top: '18.2%', width: '6.6%', rotate: '21deg' },
  { id: 'l2', left: '14.3%', top: '22.2%', width: '6.2%', rotate: '-28deg' },
  { id: 'l3', left: '76.2%', top: '16.2%', width: '5.6%', rotate: '35deg' },
  { id: 'l4', left: '81.1%', top: '20.2%', width: '7%', rotate: '-43deg' },
  { id: 'l5', left: '11.3%', top: '72.2%', width: '5.5%', rotate: '32deg' },
  { id: 'l6', left: '16.2%', top: '76.2%', width: '7%', rotate: '-36deg' },
  { id: 'l7', left: '74.2%', top: '74.2%', width: '5.8%', rotate: '-41deg' },
  { id: 'l8', left: '79.2%', top: '68.2%', width: '7.2%', rotate: '31deg' },
];

export default function TitleScreen({ onStart, isExiting = false }) {
  const handleClick = useCallback(() => {
    if (isExiting) return;
    onStart?.();
  }, [isExiting, onStart]);

  return (
    <div className="screen screen--title" onClick={handleClick}>
      <div className={`title-content title-layout ${isExiting ? 'title-content--exiting' : ''}`} role="button" tabIndex={0}>
        <div className="title-brand" data-node-id="2:190">
          <img
            src={astraIcon}
            alt="Astra Developers logo"
            className="title-brand-logo"
            width="78"
            height="74"
            draggable="false"
          />
          <p className="title-brand-name">Astra Developers</p>
        </div>

        <h1 className="title-main" data-node-id="2:3">Star Link</h1>

        <img
          src={titleQrCode}
          alt="Registration QR code"
          className="title-qr"
          data-node-id="2:159"
          width="230"
          height="230"
          draggable="false"
        />

        <p className="title-instruction-primary" data-node-id="2:160">
          SCAN ID TO THE CAMERA TO START PLAYING
        </p>

        <p className="title-instruction-secondary" data-node-id="2:174">
          OR CONNECT TO OUR LOCAL WIFI THEN SCAN THE QR ABOVE THIS WILL RETURN ANOTHER QR CODE
          TO THEN YOU SHOULD SCAN IN THE CAMERA
        </p>

        <p className="title-password" data-node-id="2:192">PASSWORD: Password123</p>
        <p className="title-ssid" data-node-id="2:191">WIFI SSDID: 12345678</p>
      </div>
    </div>
  );
}
