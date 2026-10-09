<template>
    <nav class="navbar navbar-expand-lg">
        <div class="container-fluid">
            <a class="navbar-brand" href="/">Memory Go</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbar" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse justify-content-end" id="navbar">
                <ul class="navbar-nav nav-links">
                    <li class="nav-item"><router-link to="/memory" class="nav-link">Memory</router-link></li>
                    <li class="nav-item"><router-link to="/object" class="nav-link">Object</router-link></li>
                    <li class="nav-item"><router-link to="/sequence" class="nav-link">Sequence</router-link></li>
                    <li class="nav-item"><router-link to="/pattern" class="nav-link">Pattern</router-link></li>
                    <li class="nav-item"><router-link to="/missing" class="nav-link">Missing</router-link></li>
                </ul>
            </div>
        </div>
        
        
    </nav>
    
    
</template>
<style scoped>
   
</style>