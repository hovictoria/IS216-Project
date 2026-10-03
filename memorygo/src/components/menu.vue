<template>
    <nav class="navbar navbar-expand-lg">
        <div class="container-fluid">
            <a class="navbar-brand" href="#">Memory Go</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbar">
                <ul class="navbar-nav nav-links">
                    <li class="nav-item"><router-link to="/" class="nav-link active">Home</router-link></li>
                    <li class="nav-item"><router-link to="/profile" class="nav-link">Profile</router-link></li>
                    <li class="nav-item"><router-link to="/games" class="nav-link">Games</router-link></li>
                    <li class="nav-item"><router-link to="/map" class="nav-link">Map</router-link></li>
                    <li class="nav-item"><router-link to="/collection" class="nav-link">Collection</router-link></li>
                </ul>
            </div>
        </div>
        
        
    </nav>
    
    
</template>
<style scoped>
   
</style>