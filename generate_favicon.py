from PIL import Image
import os

def create_favicon(input_path, output_dir):
    img = Image.open(input_path)
    
    # Ensure square
    width, height = img.size
    new_size = min(width, height)
    left = (width - new_size) / 2
    top = (height - new_size) / 2
    right = (width + new_size) / 2
    bottom = (height + new_size) / 2
    img = img.crop((left, top, right, bottom))
    
    # Create PNGs
    img.resize((32, 32), Image.Resampling.LANCZOS).save(os.path.join(output_dir, 'favicon-32x32.png'))
    img.resize((16, 16), Image.Resampling.LANCZOS).save(os.path.join(output_dir, 'favicon-16x16.png'))
    
    # Create ICO
    img.save(os.path.join(output_dir, 'favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

if __name__ == "__main__":
    input_path = "Frontend/assets/favicon/logo_source.jpg"
    output_dir = "Frontend/assets/favicon"
    create_favicon(input_path, output_dir)
    print("Favicons generated successfully.")
