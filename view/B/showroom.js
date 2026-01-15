document.addEventListener('DOMContentLoaded', function() {
    // 1. Fetch the list of rooms (including the image_url)
    fetch('/api/showrooms')
        .then(res => res.json())
        .then(rooms => {
            const root = document.getElementById('gallery-root');
            
            rooms.forEach(room => {
                // 2. Create the HTML row and use room.image_url for the <img> tag
                const section = document.createElement('div');
                section.className = 'row';
                section.innerHTML = `
                    <div class="col-md-12">
                        <div class="featured-box featured-box-secundary default info-content">
                            <div class="box-content">
                                <h4>${room.name}</h4>
                                <div class="showroom-wrapper" id="room-${room.id}">
                                    <img src="${room.image_url}" class="showroom-img">
                                </div>
                            </div>
                        </div>
                    </div>`;
                root.appendChild(section);
                
                // 3. Load the dots for this specific image
                loadDots(room.id, 'room-' + room.id);
            });
        });
});

function loadDots(id, containerId) {
    fetch('/api/showroom/' + id)
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById(containerId);
            data.forEach(item => {
    const dot = document.createElement('div');
    dot.className = 'hotspot';
    dot.style.left = item.x_pos + '%';
    dot.style.top = item.y_pos + '%';
    
    
    dot.innerHTML = `
    <div class="hotspot-tooltip">
        <div class="tooltip-card">
            <a href="furnitureProductDetails.html?sku=${item.SKU}" class="tooltip-link">
                <div class="tooltip-content">
                    <h5>${item.NAME}</h5>
                    <p>${item.DESCRIPTION}</p>
                    <div class="price-box">
                        Price: $${item.RETAILPRICE}
                    </div>
                    <div class="dim-box">
                        H: ${item.HEIGHT} | W: ${item.WIDTH} | L: ${item._LENGTH}
                    </div>
                </div>
            </a>
        </div>
    </div>`;
    container.appendChild(dot);
});
        });
}