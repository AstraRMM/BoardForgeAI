# RP2040 Instrument J2 Interface

J2 is the BoardForge RP2040 instrument's generic 1x6 debug and measurement header. Its production interface contract is:

| Pin | Signal |
| --- | --- |
| 1 | GND |
| 2 | 3V3 |
| 3 | I2C_SCL |
| 4 | I2C_SDA |
| 5 | SWCLK |
| 6 | SWDIO |

Pins 3–6 are ordered to preserve the RP2040 signal-bank ordering and reduce routing inversions. This is an intentional BoardForge interface assignment for the generic header; it does not alter any manufacturer-defined IC pin map.
