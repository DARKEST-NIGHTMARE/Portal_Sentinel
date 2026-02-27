export const getUserCoordinates = () => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                });
            },
            (error) => {
                console.log("Location denied or timed out. Falling back to IP.");
                resolve(null);
            },
            { timeout: 5000 }
        );
    });
};
