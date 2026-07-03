export const DEMO_PROJECTS = [
  { id: 'BF-DEMO-ROBOTICS-CONTROLLER', title: 'Compact robotics controller with custom outline', category: 'robotics', clean: true },
  { id: 'BF-DEMO-USB-C-MCU', title: 'USB-C MCU sensor board', category: 'usb-c', clean: true },
  { id: 'BF-DEMO-CAN-NODE', title: 'CAN sensor node', category: 'can', clean: true },
  { id: 'BF-DEMO-WEARABLE-PUCK', title: 'Tiny 2-layer wearable puck', category: 'wearable', clean: true },
  { id: 'BF-DEMO-INDUSTRIAL-IO', title: 'Industrial IO board', category: 'industrial', clean: true, limitation: 'Safety certification not claimed.' },
]

export function getDemoGallery() {
  return {
    status: 'BOARD_FORGE_DEMO_GALLERY_READY',
    sourcingTruth: 'Supplier API keys missing. Live sourcing not checked.',
    projects: DEMO_PROJECTS,
  }
}
