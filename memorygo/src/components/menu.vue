<script setup>
    const username="username";
    const date=new Date();
    const weekday = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
</script>
<template>
    <body>
        <div class="d-flex flex-column flex-shrink-0 p-3 bg-body-tertiary vh-100" style="width: 250px;">
            <router-link to="/" class="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-body-emphasis text-decoration-none"><span class="fs-4">Memory Go</span></router-link>
            <hr>
            <ul class="nav nav-pills flex-column mb-auto">
                <li class="nav-item"><router-link to="/" class="nav-link active">Home</router-link></li>
                <li class="nav-item"><router-link to="/profile" class="nav-link">Profile</router-link></li>
                <li class="nav-item"><router-link to="/games" class="nav-link">Games</router-link></li>
                <li class="nav-item"><router-link to="/map" class="nav-link">Map</router-link></li>
                <li class="nav-item"><router-link to="/collection" class="nav-link">Collection</router-link></li>
            </ul>
            <hr>
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" role="switch" id="flexSwitchCheckDefault">
                <label class="form-check-label" for="flexSwitchCheckDefault">Read pages aloud</label>
            </div>

        </div>
        
        <aside>
            <h1 class="text-center">Welcome {{ username }}</h1>
            <p>Today is: {{weekday[date.getDay()]}} {{ date.toLocaleDateString('en-GB', {day: '2-digit',month: 'short',year: 'numeric'}) }}</p>
        </aside>
        

    
    </body>
</template>
<style scoped>
    body{
        display:flex;
    }
    aside{
        display:block;
        margin-left:30px;
        margin-top:30px;
    }
</style>