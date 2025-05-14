#!/bin/bash

# Blue Marble Next Gen (Daytime) tiles
echo "Downloading Blue Marble (Day) tiles..."
wget -c https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74368/world.topo.200406.3x21600x21600.A1.png
wget -c https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74368/world.topo.200406.3x21600x21600.A2.png
wget -c https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74368/world.topo.200406.3x21600x21600.B1.png
wget -c https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74368/world.topo.200406.3x21600x21600.B2.png
wget -c https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74368/world.topo.200406.3x21600x21600.C1.png
wget -c https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74368/world.topo.200406.3x21600x21600.C2.png
wget -c https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74368/world.topo.200406.3x21600x21600.D1.png
wget -c https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74368/world.topo.200406.3x21600x21600.D2.png

# Black Marble (Nighttime) 2016 tiles
echo "Downloading Black Marble (Night) tiles..."
wget -c https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_A1.jpg
wget -c https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_A2.jpg
wget -c https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_B1.jpg
wget -c https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_B2.jpg
wget -c https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_C1.jpg
wget -c https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_C2.jpg
wget -c https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_D1.jpg
wget -c https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_D2.jpg

echo "✅ All downloads attempted. Use wget -c to resume any that fail."
