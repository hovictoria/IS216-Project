<script setup>
    const username="username";
    const date=new Date()
</script>
<template>
    <nav class="navbar navbar-expand-lg">
        <div class="container-fluid">
            <a class="navbar-brand" href="#">Memory Go</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse justify-content-end" id="navbar">
                <ul class="navbar-nav nav-links text-end">
                    <li class="nav-item"><router-link to="/" class="nav-link active">Home</router-link></li>
                    <li class="nav-item"><router-link to="/profile" class="nav-link">Profile</router-link></li>
                    <li class="nav-item"><router-link to="/games" class="nav-link">Games</router-link></li>
                    <li class="nav-item"><router-link to="/map" class="nav-link">Map</router-link></li>
                    <li class="nav-item"><router-link to="/collection" class="nav-link">Collection</router-link></li>
                </ul>
            </div>
        </div>
        
        
    </nav>
    <h1 class="text-center">Welcome {{ username }}</h1>
    <div class="container">
        <div class="row">
            <div class="col-3">
                <p>Today is: {{ date.toLocaleString('en-GB') }}</p>
            </div>
            <div class="col-9">
                <img src="/src/assets/morning.jpg" alt="">
            </div>

        </div>

    </div>
    
</template>
<style scoped>
   
</style>