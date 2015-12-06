$( window ).load(function() {

	var input = document.getElementById('originalImage');
	input.addEventListener('change', handleFiles);

	function handleFiles(e) {
	    var ctx = document.getElementById('canvas').getContext('2d');
	    var img = new Image;
	    img.src = URL.createObjectURL(e.target.files[0]);
	    img.onload = function() {
	        ctx.drawImage(img, 20,20);
	    }
	}

});